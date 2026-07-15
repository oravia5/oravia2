# Oravia

A full-stack social media platform with shoppable product cards, digital file downloads, reels, real-time notifications, and affiliate marketing features. Built with React 19, Express 4, and MongoDB.

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express 4** | REST API server |
| **MongoDB + Mongoose 8** | Database and ODM |
| **JWT (jsonwebtoken)** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **Multer** | File upload handling |
| **Nodemailer** | OTP email delivery (Gmail SMTP) |
| **dotenv** | Environment variable management |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI library |
| **Vite 8** | Build tool and dev server |
| **React Router 7** | Client-side routing |
| **Axios** | HTTP client |
| **Lucide React** | Icon library |

---

## Project Structure

```
oravia/
├── backend/
│   ├── config/
│   │   └── db.js                    # MongoDB connection
│   ├── controllers/
│   │   ├── auth.controller.js       # Register, login, OTP, password reset
│   │   ├── users.controller.js      # Profile, follow/unfollow, block
│   │   ├── posts.controller.js      # Post CRUD, feed, likes, shares
│   │   ├── reels.controller.js      # Reels listing and creation
│   │   ├── comments.controller.js   # Comments with nested replies
│   │   ├── products.controller.js   # Product wishlist toggle
│   │   ├── notification.controller.js  # Notifications CRUD
│   │   └── locations.controller.js  # Location autocomplete
│   ├── middleware/
│   │   ├── auth.middleware.js        # JWT protect / optionalAuth
│   │   └── upload.middleware.js      # Multer config + file size validation
│   ├── models/
│   │   ├── User.js
│   │   ├── Post.js
│   │   ├── Comment.js
│   │   ├── Notification.js
│   │   ├── Location.js
│   │   └── OTP.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── posts.routes.js
│   │   ├── reels.routes.js
│   │   ├── comments.routes.js
│   │   ├── products.routes.js
│   │   ├── notification.routes.js
│   │   └── locations.routes.js
│   ├── services/
│   │   ├── storage.service.js       # Local file storage abstraction
│   │   ├── notification.service.js  # Notification helper functions
│   │   └── email.service.js         # Nodemailer OTP email templates
│   ├── uploads/                     # Uploaded media files (served statically)
│   ├── .env                         # Environment variables
│   ├── package.json
│   └── server.js                    # Express app entry point
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js            # Axios instance with interceptors
│   │   ├── context/
│   │   │   ├── AuthContext.jsx       # Auth state + login/register/logout
│   │   │   └── NotificationContext.jsx  # Notification polling + state
│   │   ├── components/
│   │   │   ├── BottomNav/            # Mobile bottom navigation bar
│   │   │   ├── PostCard/             # Post card with products, likes, comments
│   │   │   ├── ReelCard/             # Reel video card
│   │   │   ├── ReelPlayer/           # Full-screen reel player
│   │   │   ├── CommentsSheet/        # Slide-up comments panel
│   │   │   ├── ProfileHeader/        # Profile header with follow/edit
│   │   │   └── CaptionInput/         # Caption with hashtag/mention support
│   │   ├── pages/
│   │   │   ├── Home.jsx              # Feed (posts + reels mixed)
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── VerifyOTP.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── CreatePost.jsx        # Create post/reel with products
│   │   │   ├── PostDetail.jsx        # Single post view (shared via link)
│   │   │   ├── Profile.jsx           # User profile with tabs
│   │   │   ├── EditProfile.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── Reels.jsx             # Reels feed
│   │   │   ├── Search.jsx            # Search users and posts
│   │   │   ├── Notifications.jsx
│   │   │   ├── Messages.jsx          # Placeholder
│   │   │   ├── HashtagFeed.jsx       # Posts by hashtag
│   │   │   ├── LocationFeed.jsx      # Posts by location
│   │   │   └── FollowList.jsx        # Followers / Following list
│   │   ├── App.jsx                   # Router + route guards
│   │   ├── main.jsx                  # React root mount
│   │   └── index.css                 # Global styles + design system
│   ├── package.json
│   └── vite.config.js
│
├── mongodb/                          # Local MongoDB binaries
├── data/                             # Local MongoDB data directory
└── .gitignore
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **MongoDB** running locally on `mongodb://127.0.0.1:27017` (or update `.env`)
- **Gmail App Password** for OTP emails (update `email.service.js`)

### Environment Variables

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/wisp
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d
UPLOAD_DIR=./uploads
```

### Installation

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Running

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Backend API Reference

All endpoints are prefixed with `/api`. Protected endpoints require a `Bearer` token in the `Authorization` header.

### Auth (`/api/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Register new user (multipart: avatar + fields). Sends OTP to email. |
| `POST` | `/verify-otp` | Public | Verify registration OTP. Returns JWT + user data. |
| `POST` | `/login` | Public | Login with email/username + password. Returns JWT + user data. |
| `GET` | `/me` | Protected | Get current authenticated user profile. |
| `POST` | `/forgot-password` | Public | Request password reset OTP via email. |
| `POST` | `/reset-password` | Public | Reset password with OTP + new password. |

**Register request body (multipart/form-data):**
- `username`, `email`, `password`, `displayName`, `bio`, `avatar` (file)

**Login request body (JSON):**
```json
{ "emailOrUsername": "john", "password": "secret123" }
```

---

### Users (`/api/users`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/search?q=` | Public | Search users by username/displayName. |
| `GET` | `/:username` | Optional | Get user profile with post counts. |
| `PUT` | `/me` | Protected | Update profile (multipart: avatar, cover + fields). |
| `POST` | `/change-password` | Protected | Change password (oldPassword + newPassword). |
| `POST` | `/:id/follow` | Protected | Follow a user. Creates notification. |
| `POST` | `/:id/unfollow` | Protected | Unfollow a user. |
| `POST` | `/:id/block` | Protected | Block a user. |
| `POST` | `/:id/unblock` | Protected | Unblock a user. |
| `GET` | `/:id/followers` | Public | Get user's follower list (paginated). |
| `GET` | `/:id/following` | Public | Get user's following list (paginated). |

**Update profile fields:**
`displayName`, `bio`, `phone`, `website`, `location`, `dob`, `profession`, `gender`, `profileVisibilityControls`

---

### Posts (`/api/posts`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Protected | List posts with filters (author, type, saved, archived, draft). |
| `GET` | `/feed` | Protected | Home timeline: own + followed users + discover backfill, reels interleaved every 5th item. |
| `GET` | `/tag/:tag` | Public | Posts by hashtag. |
| `GET` | `/location-feed/:location` | Public | Posts by location (case-insensitive). |
| `GET` | `/search-posts?q=` | Protected | Full-text search across caption, location, hashtags. |
| `POST` | `/` | Protected | Create post (multipart: media + productImages + productFiles + JSON body). |
| `GET` | `/:id` | Public | Get single post with populated author. |
| `PUT` | `/:id` | Protected | Update post (caption, location, products, status, isArchived). |
| `DELETE` | `/:id` | Protected | Delete post + associated media files. |
| `POST` | `/:id/like` | Protected | Toggle like (mutually exclusive with dislike). Creates notification. |
| `POST` | `/:id/dislike` | Protected | Toggle dislike (mutually exclusive with like). |
| `POST` | `/:id/save` | Protected | Bookmark post. |
| `POST` | `/:id/unsave` | Protected | Remove bookmark. |
| `POST` | `/:id/share` | Public | Increment share count + generate shareable URL. |
| `POST` | `/:id/archive` | Protected | Archive post (hide from public). |
| `POST` | `/:id/unarchive` | Protected | Unarchive post. |

**Create post request body (multipart/form-data):**
- `media` (files, max 10) — Main photos/videos
- `productImages` (files, max 10) — Product card cover images
- `productFiles` (files, max 10) — Digital download files (PDF, ZIP, any type)
- `products` (JSON string) — Array of product objects
- `caption` (text)
- `location` (text)
- `album` (text)
- `status` — `published` or `draft`

**Product JSON structure:**
```json
[
  {
    "title": "Product Name",
    "link": "https://affiliate-link.com",
    "price": "$29",
    "originalPrice": "$59",
    "hasProductImage": true,
    "hasDigitalFile": true,
    "digitalFileName": "ebook.pdf",
    "stores": [
      { "name": "Amazon", "link": "https://amazon.com/..." },
      { "name": "Etsy", "link": "https://etsy.com/..." }
    ]
  }
]
```

---

### Reels (`/api/reels`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Public | List all published reels (newest first). |
| `POST` | `/` | Protected | Create reel (single video + products, same as post creation). |

---

### Comments (`/api`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/posts/:id/comments` | Public | Get comments for a post (with nested replies + author data). |
| `POST` | `/posts/:id/comments` | Protected | Add comment (multipart: text + optional commentMedia image). |
| `DELETE` | `/comments/:id` | Protected | Delete comment (owner only). |
| `POST` | `/comments/:id/like` | Protected | Toggle like on comment. |
| `POST` | `/comments/:id/dislike` | Protected | Toggle dislike on comment. |

**Comment features:**
- Nested replies via `parentComment` field (one level deep)
- Image attachments on comments
- Like/dislike toggle (mutually exclusive)

---

### Notifications (`/api/notifications`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Protected | Get paginated notifications (with actor, post, comment populated). |
| `GET` | `/unread-count` | Protected | Get count of unread notifications. |
| `PUT` | `/:id/read` | Protected | Mark single notification as read. |
| `PUT` | `/read-all` | Protected | Mark all notifications as read. |

**Notification types:**
- `like` — Someone liked your post
- `comment` — Someone commented on your post
- `comment_like` — Someone liked your comment
- `follow` — Someone followed you
- `share` — Someone shared your post

**Auto-created notifications:**
- Like triggers notification to post author
- Comment triggers notification to post author
- Follow triggers notification to followed user
- Self-notifications are suppressed

---

### Locations (`/api/locations`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/?q=` | Protected | Search/autocomplete locations. Returns DB results + upserts new locations. |

---

### Products (`/api/products`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/wishlist` | Protected | Toggle save/unsaved for a product. Body: `{ postId, productId }`. |
| `GET` | `/wishlist` | Protected | Get all saved products with populated post + author details. Auto-cleans dangling references. |

---

## Data Models

### User
```
username          String (unique, required, lowercase)
email             String (unique, required, lowercase)
passwordHash      String (bcrypt hashed)
displayName       String
bio               String
avatarUrl         String
coverUrl          String
website           String
location          String
phone             String
dob               Date
profession        String
gender            String
isVerified        Boolean (default: false)
followers         [ObjectId -> User]
following         [ObjectId -> User]
savedPosts        [ObjectId -> Post]
savedProducts     [{ post: ObjectId -> Post, productId: ObjectId }]
blockedUsers      [ObjectId -> User]
profileVisibilityControls { showWebsite, showLocation, showJoinedDate, showDob, showProfession, showGender } (all Boolean)
timestamps        createdAt, updatedAt
```

### Post
```
author            ObjectId -> User (required)
type              String (enum: photo, video, reel — required)
mediaUrl          String (required)
thumbnailUrl      String
caption           String
location          String
likes             [ObjectId -> User]
dislikes          [ObjectId -> User]
shareCount        Number (default: 0)
album             String (custom grouping name)
tags              [String] (hashtags parsed from caption, lowercase)
isArchived        Boolean (default: false)
status            String (enum: published, draft — default: published)
mediaItems        [{ url, type: photo|video, thumbnailUrl }]  (carousel support)
products          [{
                    title: String (required),
                    link: String,
                    price: String (required),
                    originalPrice: String,
                    imageUrl: String,
                    fileUrl: String (digital download path),
                    fileName: String,
                    stores: [{ name: String, link: String }]
                  }]
timestamps        createdAt, updatedAt
```

### Comment
```
post              ObjectId -> Post (required)
author            ObjectId -> User (required)
parentComment     ObjectId -> Comment (null = top-level, non-null = reply)
text              String
mediaUrl          String (image attachment on comments)
likes             [ObjectId -> User]
dislikes          [ObjectId -> User]
timestamps        createdAt only
```

### Notification
```
recipient         ObjectId -> User (indexed)
actor             ObjectId -> User
type              String (enum: like, comment, follow, share, comment_like)
post              ObjectId -> Post (nullable)
comment           ObjectId -> Comment (nullable)
read              Boolean (default: false)
timestamps        createdAt, updatedAt
Compound index    (recipient, createdAt DESC)
```

### Location
```
name              String (unique, required)
count             Number (default: 1, incremented on upsert)
timestamps        createdAt, updatedAt
```

### OTP
```
email             String (required)
code              String (6-digit code)
purpose           String (enum: register, forgot_password)
expiresAt         Date (TTL index, auto-expires after 10 minutes)
timestamps        createdAt only
```

---

## Frontend Routes

| Path | Component | Auth | Description |
|---|---|---|---|
| `/login` | Login | Public | Email/username + password login |
| `/register` | Register | Public | Registration with avatar upload |
| `/verify-otp` | VerifyOTP | Public | Enter OTP to verify account |
| `/forgot-password` | ForgotPassword | Public | Request + enter reset OTP |
| `/` | Home | Protected | Feed (posts + reels interleaved) |
| `/snips` | Reels | Protected | Vertical reels feed |
| `/search` | Search | Protected | Search users and posts |
| `/create-post` | CreatePost | Protected | Create post/reel with products |
| `/post/:id` | PostDetail | Public | Single post view (shareable link) |
| `/profile` | Profile | Protected | Own profile with tabs |
| `/profile/:username` | Profile | Protected | Other user's profile |
| `/profile/:username/:type` | FollowList | Protected | Followers or following list |
| `/edit-profile` | EditProfile | Protected | Edit profile fields + avatar/cover |
| `/settings` | Settings | Protected | Account settings |
| `/notifications` | Notifications | Protected | Notification feed |
| `/messages` | Messages | Protected | Placeholder page |
| `/tag/:tag` | HashtagFeed | Protected | Posts by hashtag |
| `/location/:location` | LocationFeed | Protected | Posts by location |

---

## Features

### Authentication & Account
- Email + password registration with avatar upload
- OTP verification via email (6-digit code, 10-minute expiry)
- JWT-based session with 7-day expiry
- Auto-redirect to login on token expiry (401 interceptor)
- Forgot password flow with OTP reset
- Password change from settings

### Home Feed
- Mixed timeline: own posts + followed users' posts
- Discover backfill when followed content is insufficient
- Reels interleaved every 5th item in the feed
- Comment count computed via aggregation for all feed items

### Posts & Media
- Create posts with photos or videos (up to 10 media items)
- Carousel/swipe support for multi-image posts
- Caption with auto-parsed hashtags (`#tag`) and mentions (`@user`)
- Location tag with autocomplete from popular + user-generated locations
- Album grouping (create new or add to existing)
- Edit caption and location after posting
- Archive / unarchive posts (hide from public feed)
- Save / bookmark posts
- Delete posts (with server-side media file cleanup)
- Share posts via Web Share API or clipboard (shareable link)

### Reels / Snips
- Create short video reels (single video per reel)
- Vertical full-screen player with play/pause, mute/unmute
- Auto-mixed into home feed

### Shoppable Product Cards
- Attach multiple product cards to any post
- Each product has: title, affiliate link, price, original price (strikethrough), cover image
- **Digital file downloads**: Upload PDF, ZIP, or any file as a downloadable product asset
- **Multi-store purchase links**: Add multiple store names + URLs per product (e.g., Amazon, Etsy, Gumroad)
- Fallback "Buy Now" button when no store links provided
- Products displayed as horizontally scrollable cards below post media

### Product Wishlist / Bookmarking
- Heart icon on each product card to save/unsave
- Dedicated **Wishlist tab** on profile page (owner only)
- Wishlist shows saved products in a grid with post links, download buttons, and store buttons
- Auto-cleans dangling references (deleted posts/products)

### Comments & Reactions
- Add text comments with optional image attachments
- Nested replies (one level deep)
- Like / dislike toggle on posts and comments (mutually exclusive)
- Comment count displayed on feed cards

### Notifications
- Real-time unread count polling (every 15 seconds)
- Notification types: like, comment, comment_like, follow, share
- Mark individual or all notifications as read
- Self-notifications suppressed

### User Profiles
- Public profile with avatar, cover photo, bio, website, location
- Follower / following counts and lists
- Profile visibility controls (toggle display of website, location, DOB, profession, gender)
- Follow / unfollow users
- Block / unblock users
- Tabs: Posts, Snips, Albums, Wishlist, Saved, Archive, Drafts (last 4 are owner-only)

### Search
- Search users by username or display name
- Search posts by caption, location, or hashtags

### File Upload & Storage
- Local disk storage at `backend/uploads/` (statically served)
- Multer disk storage with random filename suffixes
- File size validation: 50MB max for images, 100MB max for videos
- Auto-cleanup: if any file in a batch exceeds limits, all files are deleted and request rejected
- `productFiles` field accepts all file types (PDFs, ZIPs, etc.)
- `StorageService` abstraction (swap to AWS S3 by modifying only `storage.service.js`)

### Design System
- Dark theme (black backgrounds, zinc/slate text hierarchy)
- CSS custom properties: `--bg-primary`, `--bg-secondary`, `--accent-indigo`, `--text-primary`, `--border-color`
- Glassmorphism effects (backdrop-filter blur on headers)
- Mobile-first responsive layout
- Bottom navigation bar on mobile
- Smooth transitions and hover effects on interactive elements

---

## File Upload Fields

| Field Name | Max Count | Accepted Types | Used For |
|---|---|---|---|
| `media` | 10 | jpg, png, webp, gif, mp4, mov | Post/reel main media |
| `productImages` | 10 | jpg, png, webp, gif | Product card cover images |
| `productFiles` | 10 | All types | Digital download files (PDF, ZIP, etc.) |
| `avatar` | 1 | jpg, png, webp, gif | Profile avatar |
| `cover` | 1 | jpg, png, webp, gif | Profile cover photo |
| `commentMedia` | 1 | jpg, png, webp, gif | Comment image attachment |

---

## File Storage

All uploaded files (images, videos, digital products, avatars, covers) are stored on the **local disk** inside the `backend/uploads/` directory. This folder is served statically by Express at the `/uploads` URL path.

### How It Works

```
User uploads file
       ↓
Multer saves to disk → backend/uploads/{fieldname}-{timestamp}-{random}.{ext}
       ↓
StorageService.getUrl(file) → returns "/uploads/{filename}"
       ↓
Frontend displays via → http://127.0.0.1:5000/uploads/{filename}
```

### Storage Path

| What | Where Saved | URL Pattern | Example |
|---|---|---|---|
| Post media (photos/videos) | `backend/uploads/` | `/uploads/media-{ts}-{rand}.jpg` | `/uploads/media-1783676249816-679634165.jpg` |
| Product images | `backend/uploads/` | `/uploads/productImages-{ts}-{rand}.jpg` | `/uploads/productImages-1783602429751-407645712.jpg` |
| Digital product files | `backend/uploads/` | `/uploads/productFiles-{ts}-{rand}.pdf` | `/uploads/productFiles-1783602429751-407645712.pdf` |
| Profile avatar | `backend/uploads/` | `/uploads/avatar-{ts}-{rand}.jpg` | `/uploads/avatar-1783678154566-917352591.jpg` |
| Profile cover photo | `backend/uploads/` | `/uploads/cover-{ts}-{rand}.jpg` | `/uploads/cover-1783678154574-579254908.jpg` |
| Comment images | `backend/uploads/` | `/uploads/commentMedia-{ts}-{rand}.jpg` | `/uploads/commentMedia-1783676382399-520576337.jpg` |

### Filename Convention

Multer generates filenames using this pattern:
```
{fieldname}-{Date.now()}-{Math.random() * 1e9}{originalExtension}
```

Example: `media-1783676497807-809947682.mp4`

### File Size Limits

| Type | Max Size | Action on Violation |
|---|---|---|
| Images (jpg, png, webp, gif) | 50 MB | All files in request deleted, 400 error returned |
| Videos (mp4, mov) | 100 MB | All files in request deleted, 400 error returned |
| Digital files (PDF, ZIP, etc.) | 100 MB | All files in request deleted, 400 error returned |

### Accepted File Types by Upload Field

| Field | Accepted Types |
|---|---|
| `media` | jpeg, jpg, png, webp, gif, mp4, mov, quicktime |
| `productImages` | jpeg, jpg, png, webp, gif |
| `productFiles` | All types (no restriction) |
| `avatar` | jpeg, jpg, png, webp, gif |
| `cover` | jpeg, jpg, png, webp, gif, mp4, mov |
| `commentMedia` | jpeg, jpg, png, webp, gif |

### Static File Serving

```javascript
// server.js
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
```

All files in `backend/uploads/` are accessible at `http://localhost:5000/uploads/{filename}`.

### Frontend URL Resolution

The frontend prepends the backend base URL to `/uploads/` paths:

```javascript
// PostCard.jsx, Profile.jsx, etc.
const getFullMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/uploads/')) {
    return `http://127.0.0.1:5000${url}`;
  }
  return url;  // Already a full URL (external)
};
```

### Database Storage

File paths are stored in MongoDB as **relative paths** (e.g., `/uploads/media-123-456.jpg`), not full URLs. This allows flexible URL generation:

| Model Field | Stored Value |
|---|---|
| `Post.mediaUrl` | `/uploads/media-1783676249816-679634165.jpg` |
| `Post.thumbnailUrl` | `/uploads/media-1783676249816-679634165.jpg` |
| `Post.mediaItems[].url` | `/uploads/media-1783676497807-809947682.mp4` |
| `Post.products[].imageUrl` | `/uploads/productImages-1783602429751-407645712.jpg` |
| `Post.products[].fileUrl` | `/uploads/productFiles-1783602429751-407645712.pdf` |
| `User.avatarUrl` | `/uploads/avatar-1783678154566-917352591.jpg` |
| `User.coverUrl` | `/uploads/cover-1783678154574-579254908.jpg` |
| `Comment.mediaUrl` | `/uploads/commentMedia-1783676382399-520576337.jpg` |

### File Deletion

When posts or profiles are updated/deleted, files are removed from disk via `StorageService.deleteFile()`:

```javascript
// storage.service.js
deleteFile(fileUrl) {
  const fileName = fileUrl.replace('/uploads/', '');
  const filePath = path.join(process.cwd(), 'uploads', fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);  // Synchronous delete
  }
}
```

Deletion is triggered when:
- Post is deleted → all media, product images, and product files removed
- Profile avatar/cover is updated → old file removed
- Post is edited → replaced media files removed

### Migration to Cloud Storage

The `StorageService` class is designed as an abstraction layer. To migrate to AWS S3 or similar:

1. **Install**: `npm install @aws-sdk/client-s3 multer-s3`
2. **Update `upload.middleware.js`**: Replace `multer.diskStorage` with `multer-s3` storage engine pointing to your S3 bucket
3. **Update `storage.service.js`**: Replace `getUrl()` to return S3 public URLs, `deleteFile()` to use S3 `DeleteObjectCommand`
4. **Remove static serving**: Remove `app.use('/uploads', ...)` from `server.js` (files now served from CDN)

### .gitignore

The `uploads/` directory is excluded from version control:
```
backend/uploads/
```

### Test Files

Existing uploads in `backend/uploads/`:
```
avatar-1783602429751-407645712.jpg         70 KB
avatar-1783678154566-917352591.jpg        465 KB
avatar-1783679534810-298445335.jpg        640 KB
commentMedia-1783676382399-520576337.jpg  1.4 MB
cover-1783668348859-924716721.mp4         3.8 MB
cover-1783678154574-579254908.jpg         1.7 MB
media-1783676249816-679634165.jpg         1.7 MB
media-1783676249834-889810694.jpg         1.2 MB
media-1783676249847-739116186.jpg         1.9 MB
media-1783676497807-809947682.mp4         4.5 MB
```

---

## Test Scripts

Backend test scripts in `backend/` directory:

| Script | Description |
|---|---|
| `test-otp-flow.js` | OTP registration and verification flow |
| `test-products-flow.js` | Product schema and shoppable post creation |
| `test-wishlist-flow.js` | Wishlist toggle, multi-store, price comparison, download links |

Run with:
```bash
cd backend
node test-wishlist-flow.js
```

---

## Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Express server port |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/wisp` | MongoDB connection string |
| `JWT_SECRET` | `wisp_secret_token_2026_key_99` | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | Token expiry duration |
| `UPLOAD_DIR` | `./uploads` | Directory for uploaded files |

---

## API Response Format

All endpoints return responses in this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## License

Private — Oravia Pvt Ltd. All rights reserved.
