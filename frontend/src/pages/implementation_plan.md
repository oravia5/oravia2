# Implementation Plan - Hashtags, User Mentions, and Location Tagging

This plan introduces:
1. **Hashtags (`#tag`)**: Clickable links in captions/reels routing to a dedicated Hashtag page displaying all tagged posts/reels.
2. **User Mentions (`@username`)**: Clickable profile links inside captions/reels routing directly to targeted user profiles.
3. **Location Tagging (`location`)**: Clickable location links on posts routing to a dedicated Location page displaying all posts tagged at that location.

---

## Proposed Changes

### [Backend] Post Database Layer

#### [MODIFY] [Post.js](file:///c:/oravia/backend/models/Post.js)
* Update schema to store parsed hashtags as an array of lowercase strings (`tags: [String]`).

---

### [Backend] Post & Reel Logic Layer

#### [MODIFY] [posts.controller.js](file:///c:/oravia/backend/controllers/posts.controller.js)
* Implement a helper function `parseHashtags(captionText)` to extract words prefixing with `#` and normalize them to lowercase.
* Update `createPost` to call `parseHashtags` and save the tags.
* Implement query function `getPostsByHashtag(req, res)` querying `Post.find({ tags: tag })`.
* Implement query function `getPostsByLocation(req, res)` querying `Post.find({ location: { $regex: new RegExp(location, 'i') } })` to match location string case-insensitively.

#### [MODIFY] [posts.routes.js](file:///c:/oravia/backend/routes/posts.routes.js)
* Add GET route `/tag/:tag` for `getPostsByHashtag`.
* Add GET route `/location-feed/:location` for `getPostsByLocation`.

#### [MODIFY] [reels.controller.js](file:///c:/oravia/backend/controllers/reels.controller.js)
* Update `createReel` to call the `parseHashtags` helper (or write equivalent local regex) and store tags array inside the reel document.

---

### [Frontend] Shared Text Rendering Logic

#### [MODIFY] [PostCard.jsx](file:///c:/oravia/frontend/src/components/PostCard/PostCard.jsx)
* Add helper `parseCaptionText(text)` to split string by word blocks and substitute `#hashtag` and `@username` occurrences into active `<Link>` elements.
* Render the caption block using `parseCaptionText(post.caption)`.
* Wrap the location indicator block with a React Router `<Link>` element routing to `/location/:locationName`.

#### [MODIFY] [ReelPlayer.jsx](file:///c:/oravia/frontend/src/components/ReelPlayer/ReelPlayer.jsx)
* Import `Link` from `react-router-dom`.
* Add `parseCaptionText` helper.
* Render the reel caption using `parseCaptionText(reel.caption)`.

---

### [Frontend] New Feed Pages

#### [NEW] [HashtagFeed.jsx](file:///c:/oravia/frontend/src/pages/HashtagFeed.jsx)
* A grid-style layout displaying all matching photos, videos, and reels matching the route parameter `:tag`.
* Includes custom header styling with hashtag name and posts count indicators.

#### [NEW] [LocationFeed.jsx](file:///c:/oravia/frontend/src/pages/LocationFeed.jsx)
* A grid-style layout showing posts tagged at the route parameter location `:location`.
* Includes custom header styling with location marker details and posts count.

---

### [Frontend] Route Registrations

#### [MODIFY] [App.jsx](file:///c:/oravia/frontend/src/App.jsx)
* Import `HashtagFeed` and `LocationFeed` pages.
* Register routes:
  - `/tag/:tag` (Protected)
  - `/location/:location` (Protected)

---

## Verification Plan

### Automated/Manual Testing Steps
1. **Creation Verification:**
   - Create a post containing both `#cool` and `@aavnik` in the caption. Select a location (e.g. `Kolkata`).
   - Create a Reel containing `#short` and `#vibes`.
2. **Database Verification:**
   - Verify the post object in database contains `tags: ["cool"]` and `location: "Kolkata"`.
3. **Frontend UI Verification:**
   - Click `#cool` link in post caption -> goes to `/tag/cool` showing the post.
   - Click `@aavnik` link in post caption -> redirects to profile page of `aavnik`.
   - Click the location link `Kolkata` under username -> goes to `/location/Kolkata` showing the post.
