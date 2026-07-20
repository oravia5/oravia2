# Oravia Platform — Complete NSFW Moderation & Filtering System Documentation

This document contains the complete step-by-step setup details, database schema, backend code changes, frontend UI changes, and AWS infrastructure configuration for the NSFW (adult/mature content) filtering and automated moderation system implemented on the Oravia platform.

---

## 1. Overview & Architecture

The system provides dual-layer protection:
1. **User Preference Layer (Frontend & Backend):** Users can opt-in to view mature content (default is `OFF`/Safe). Public (guest) visitors never see NSFW content.
2. **Automated Scanning Layer (AWS Image & Video Rekognition):** Image and video uploads are scanned for explicit contents. If flagged, they are hidden from feeds. Pending videos are hidden until the scan finishes.

### Media Scan Pipeline Workflow
```
[User Uploads Image/Video]
         │
         ├──► Uploaded to S3 (bucket: oravia-media-storage)
         │
         └──► Triggers AWS Lambda 1 (oravia-image-moderation)
                  │
                  ├──► [IF IMAGE] (Synchronous Scan):
                  │         Rekognition DetectModerationLabels
                  │         calls POST /api/internal/update-moderation
                  │         Updates DB status (isNSFW: true/false)
                  │
                  └──► [IF VIDEO] (Asynchronous Scan):
                            Rekognition StartContentModeration
                            (Notifies SNS Topic on job completion)
                                     │
                                     └──► Triggers Lambda 2 (oravia-video-callback)
                                               Retrieves GetContentModeration results
                                               calls POST /api/internal/update-moderation
                                               Updates DB status (isNSFW: true/false)
```

---

## 2. Database Modifications

### 2.1 User Schema (`backend/models/User.js`)
Added a new Boolean attribute `showNSFW` at the root level of the schema:
```javascript
showNSFW: {
  type: Boolean,
  default: false, // safe by default
},
```

### 2.2 Post Schema (`backend/models/Post.js`)
Used to track scanning results (added prior to this phase):
```javascript
isNSFW: {
  type: Boolean,
  default: null, // null = unscanned/pending
},
moderationStatus: {
  type: String,
  enum: ['pending', 'completed'],
  default: 'pending',
},
```

---

## 3. Backend Integration (API Routes & Controllers)

### 3.1 Authentication Controller (`backend/controllers/auth.controller.js`)
Updated to support registration preferences and return NSFW settings upon login/OTP verification:
- **`registerUser`:** Reads `showNSFW` from `req.body` and stores it:
  ```javascript
  const { username, email, password, phone, displayName, bio, showNSFW } = req.body;
  ...
  const user = await User.create({
    ...,
    showNSFW: showNSFW === 'true' || showNSFW === true,
  });
  ```
- **`verifyRegisterOTP` & `loginUser`:** Returned `showNSFW: user.showNSFW || false` inside the response data payload.

### 3.2 Users Profile Controller (`backend/controllers/users.controller.js`)
Allowed users to toggle NSFW settings in the profile editor:
- **`updateProfile`:**
  - Destructured `showNSFW` from `req.body`.
  - Added condition to update:
    ```javascript
    if (showNSFW !== undefined) {
      user.showNSFW = showNSFW === 'true' || showNSFW === true;
    }
    ```
  - Appended `showNSFW: updatedUser.showNSFW || false` to the returned user details payload.

### 3.3 Internal Moderation Routes (`backend/routes/internal.routes.js`)
Called by Lambda functions to update post/reel data in MongoDB based on S3 filename matching. Modified search query to check both media file paths and generated thumbnail URLs:
```javascript
router.post('/update-moderation', async (req, res) => {
  try {
    if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SECRET) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { fileKey, isNSFW } = req.body;
    if (!fileKey) {
      return res.status(400).json({ success: false, message: 'fileKey required' });
    }

    const result = await Post.findOneAndUpdate(
      {
        $or: [
          { mediaUrl: { $regex: fileKey, $options: 'i' } },
          { thumbnailUrl: { $regex: fileKey, $options: 'i' } },
          { 'mediaItems.url': { $regex: fileKey, $options: 'i' } },
          { 'mediaItems.thumbnailUrl': { $regex: fileKey, $options: 'i' } },
        ],
      },
      { isNSFW, moderationStatus: 'completed' },
      { new: true }
    );

    if (!result) {
      console.log(`No post found matching fileKey: ${fileKey}`);
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    console.log(`Moderation updated for post ${result._id}: isNSFW=${isNSFW}`);
    res.json({ success: true, postId: result._id, isNSFW });
  } catch (err) {
    console.error('Moderation update error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
```

### 3.4 Feed & Search Queries Filtering (`backend/controllers/posts.controller.js` & `reels.controller.js`)
Feeds are filtered to hide NSFW posts/reels (`isNSFW: true`) and pending posts/reels (`moderationStatus: 'pending'`) for unauthenticated (guest) users, and users who have their preference disabled (`showNSFW: false`).

#### Gating Rule:
```javascript
const showNSFW = req.user ? req.user.showNSFW : false;
if (!showNSFW) {
  query.isNSFW = { $ne: true };
  query.moderationStatus = { $ne: 'pending' };
}
```
*Applied inside:*
- **`getFeed`** (Mixed main timeline feed)
- **`getFollowingFeed`** (Followed accounts feed)
- **`getNearYouFeed`** (Location matching feed)
- **`getPostsByHashtag`** (Hashtag timeline)
- **`getPostsByLocation`** (Location tag feed)
- **`getReels`** (Dedicated reels feed inside `reels.controller.js`)
- **`searchPosts`** (Search queries - gates posts and unique tags counts)
- **`getPosts`** (Profile feed - allowed exceptions: creators can view their own pending/NSFW posts on their profile):
  ```javascript
  const isOwnProfile = req.user && author && req.user._id.toString() === author.toString();
  if (!showNSFW && !isOwnProfile) {
    query.isNSFW = { $ne: true };
    query.moderationStatus = { $ne: 'pending' };
  }
  ```

---

## 4. AWS Infrastructure Configuration

### 4.1 SNS Topic (`oravia-video-moderation`)
- Type: **Standard**
- ARN: `arn:aws:sns:ap-south-1:969494330550:oravia-video-moderation`
- Description: Published to by Rekognition upon video scan completion.

### 4.2 IAM Roles

#### 4.2.1 Rekognition Service Role (`oravia-rekognition-sns-policy`)
Used by Rekognition to write notification events to the SNS topic.
- **Trust Policy:**
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "rekognition.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }
  ```
- **Permission Policy (`oravia-rekognition-sns-policy`):**
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": "sns:Publish",
        "Resource": "arn:aws:sns:ap-south-1:969494330550:oravia-video-moderation"
      }
    ]
  }
  ```

#### 4.2.2 Lambda Role (`oravia-moderation-lambda-role`)
Used by both image scan and callback Lambdas:
- Policies attached: `AmazonRekognitionFullAccess`, `AmazonS3ReadOnlyAccess`, `AWSLambdaBasicExecutionRole`.

### 4.3 S3 Event Notifications (`oravia-media-storage`)
- **Trigger 1 (Images/Video Start):** Name: `posts-upload` | Prefix: `posts/` | Events: `s3:ObjectCreated:*` | Destination: `oravia-image-moderation`
- **Trigger 2 (Reels/Video Start):** Name: `oravia-reels-upload` | Prefix: `reels/` | Events: `s3:ObjectCreated:*` | Destination: `oravia-image-moderation`

### 4.4 Lambda Functions Code

#### 4.4.1 Lambda 1: Unified Media Moderation (`oravia-image-moderation`)
```javascript
import { 
  RekognitionClient, 
  DetectModerationLabelsCommand, 
  StartContentModerationCommand 
} from "@aws-sdk/client-rekognition";

const rekognition = new RekognitionClient({ region: "ap-south-1" });

const SNS_TOPIC_ARN = "arn:aws:sns:ap-south-1:969494330550:oravia-video-moderation";
const REKOGNITION_ROLE_ARN = "arn:aws:iam::969494330550:role/oravia-rekognition-sns-policy";

export const handler = async (event) => {
  try {
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(
      event.Records[0].s3.object.key.replace(/\+/g, " ")
    );

    console.log(`Processing S3 Object: ${bucket}/${key}`);
    const ext = key.split('.').pop().toLowerCase();
    const isVideo = ["mp4", "mov", "mkv", "avi", "quicktime"].includes(ext);

    if (isVideo) {
      console.log(`Starting Asynchronous Video Moderation for: ${key}`);
      const command = new StartContentModerationCommand({
        Video: {
          S3Object: {
            Bucket: bucket,
            Name: key,
          },
        },
        MinConfidence: 70,
        NotificationChannel: {
          SNSTopicArn: SNS_TOPIC_ARN,
          RoleArn: REKOGNITION_ROLE_ARN,
        },
      });

      const result = await rekognition.send(command);
      console.log(`Moderation Job started with JobId: ${result.JobId}`);
      return { statusCode: 200, body: JSON.stringify({ message: "Video scan started", jobId: result.JobId }) };
    } else {
      console.log(`Running Synchronous Image Moderation for: ${key}`);
      const command = new DetectModerationLabelsCommand({
        Image: {
          S3Object: {
            Bucket: bucket,
            Name: key,
          },
        },
        MinConfidence: 70,
      });

      const result = await rekognition.send(command);
      const isNSFW = result.ModerationLabels.length > 0;

      console.log(`File: ${key} | isNSFW: ${isNSFW}`);
      console.log("Labels found:", JSON.stringify(result.ModerationLabels));

      const response = await fetch("https://oravia.co.in/api/internal/update-moderation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": "oravia_secure_k9x7m2p4q8w1",
        },
        body: JSON.stringify({ fileKey: key, isNSFW }),
      });

      if (!response.ok) {
        console.error(`Backend update failed: ${response.status}`);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ fileKey: key, isNSFW }),
      };
    }
  } catch (error) {
    console.error("Error processing moderation:", error);
    throw error;
  }
};
```

#### 4.4.2 Lambda 2: Video Callback (`oravia-video-callback`)
- **Trigger Source:** SNS (`oravia-video-moderation`)
- **Timeout configuration:** 30 seconds
- **Code:**
```javascript
import { RekognitionClient, GetContentModerationCommand } from "@aws-sdk/client-rekognition";

const rekognition = new RekognitionClient({ region: "ap-south-1" });

export const handler = async (event) => {
  try {
    const message = JSON.parse(event.Records[0].Sns.Message);
    const jobId = message.JobId;
    const status = message.Status;
    const bucket = message.Video.S3Bucket;
    const key = message.Video.S3ObjectName;

    console.log(`SNS Callback received for JobId: ${jobId} | Status: ${status} | Key: ${key}`);

    if (status !== "SUCCEEDED") {
      console.error(`Moderation Job did not succeed: ${status}`);
      return { statusCode: 400, body: "Job failed" };
    }

    const command = new GetContentModerationCommand({
      JobId: jobId,
      SortBy: "TIMESTAMP",
    });

    const result = await rekognition.send(command);
    const isNSFW = result.ModerationLabels.length > 0;

    console.log(`Video processing finished. File: ${key} | isNSFW: ${isNSFW}`);
    console.log("NSFW Labels found in video:", JSON.stringify(result.ModerationLabels));

    const response = await fetch("https://oravia.co.in/api/internal/update-moderation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": "oravia_secure_k9x7m2p4q8w1",
      },
      body: JSON.stringify({ fileKey: key, isNSFW }),
    });

    if (!response.ok) {
      console.error(`Backend update failed: ${response.status}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ fileKey: key, isNSFW }),
    };
  } catch (error) {
    console.error("Error during video callback processing:", error);
    throw error;
  }
};
```

---

## 5. Frontend Modifications

### 5.1 Sign-Up Checkbox (`frontend/src/pages/Register.jsx`)
- Added `const [showNSFW, setShowNSFW] = useState(false);`
- Appended `showNSFW` to the submit payload.
- Added Form Control:
  ```jsx
  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', marginBottom: '16px' }}>
    <input
      id="showNSFW"
      type="checkbox"
      checked={showNSFW}
      onChange={(e) => setShowNSFW(e.target.checked)}
      disabled={loading}
      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ffffff', backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px' }}
    />
    <label className="auth-label" style={{ margin: 0, cursor: 'pointer', userSelect: 'none', fontSize: '13px', color: '#a1a1aa' }} htmlFor="showNSFW">
      Show NSFW / Mature Content (18+)
    </label>
  </div>
  ```

### 5.2 Settings Screen Switch Toggle (`frontend/src/pages/Settings.jsx`)
- Added `const [showNSFW, setShowNSFW] = useState(false);`
- Initialized state inside `fetchSettings` `useEffect`:
  ```javascript
  setShowNSFW(profile.showNSFW || false);
  ```
- Created toggle event handler:
  ```javascript
  const handleNSFWToggle = async () => {
    const newValue = !showNSFW;
    setShowNSFW(newValue);
    setSaveStatus('saving');

    const formData = new FormData();
    formData.append('showNSFW', newValue);

    try {
      const res = await client.put('/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        updateUserData(res.data.data);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 1500);
      } else {
        setSaveStatus('error');
        setShowNSFW(showNSFW); // Rollback
        setTimeout(() => setSaveStatus(''), 2000);
      }
    } catch (err) {
      console.error('Error saving NSFW setting:', err);
      setSaveStatus('error');
      setShowNSFW(showNSFW); // Rollback
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };
  ```
- Rendered row inside the **"Privacy & Security"** section:
  ```jsx
  <div className="settings-row">
    <div className="row-info">
      <span className="row-label">Show NSFW Content (18+)</span>
      <span className="row-desc">Show or hide adult/mature content on your timeline</span>
    </div>
    <label className="switch">
      <input 
        type="checkbox" 
        checked={showNSFW} 
        onChange={handleNSFWToggle} 
      />
      <span className="slider"></span>
    </label>
  </div>
  ```

---

## 6. Upload Size Configuration

Upload constraints are processed inside [upload.middleware.js](file:///c:/oravia/backend/middleware/upload.middleware.js):
- **Multer limits:** `fileSize: 100 * 1024 * 1024` (100MB).
- **`validateUploadLimit` middleware constraints:**
  - Videos: Max **100MB** limit.
  - Images: Max **50MB** limit.
  - Dispatches `400 Bad Request` with custom field error message if constraints are breached.

---

## 7. Operational & Deployment Details

- Production deployment is completely automated via GitHub actions triggered on pushing to the `main` branch.
- Deployment script triggers:
  ```bash
  git pull origin main
  cd frontend && npm install && npm run build
  cd ../backend && npm install
  pm2 restart oravia-backend
  ```
- To inspect execution state on the server:
  - Command: `pm2 logs oravia-backend --lines 50`
  - Status check: `pm2 status`
