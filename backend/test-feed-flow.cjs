const http = require('http');

function makeReq(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api' + path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers.Authorization = 'Bearer ' + token;
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  const login = await makeReq('/auth/login', 'POST', {
    emailOrUsername: 'wisp_coder',
    password: 'password123'
  });
  console.log('Login status:', login.status);
  if (!login.body.success) {
    console.log('Login failed:', login.body.message);
    return;
  }
  const token = login.body.data.token;
  console.log('Login body:', login.body);
  console.log('Token obtained:', token);

  console.log('\n--- TESTING [FOR YOU] FEED ---');
  const feed = await makeReq('/posts/feed', 'GET', null, token);
  console.log('Feed status:', feed.status);
  console.log('Feed body:', feed.body);

  console.log('\n--- TESTING [FOLLOWING] FEED ---');
  const followingFeed = await makeReq('/posts/following', 'GET', null, token);
  console.log('Following status:', followingFeed.status);
  console.log('Following body:', followingFeed.body);

  console.log('\n--- TESTING [NEAR YOU] FEED ---');
  const nearYouFeed = await makeReq('/posts/near-you', 'GET', null, token);
  console.log('Near You status:', nearYouFeed.status);
  console.log('Near You body:', nearYouFeed.body);

  // Test like
  if (feed.body.data?.length > 0) {
    const postId = feed.body.data[0]._id;
    console.log('\n--- Testing Like on post:', postId);
    const likeRes = await makeReq('/posts/' + postId + '/like', 'POST', null, token);
    console.log('Like status:', likeRes.status, 'success:', likeRes.body.success);
    console.log('Likes after:', likeRes.body.data?.likes?.length, 'Dislikes after:', likeRes.body.data?.dislikes?.length);

    // Test comment
    console.log('\n--- Testing Comment on post:', postId);
    const commentRes = await makeReq('/posts/' + postId + '/comments', 'POST', { text: 'Great post!' }, token);
    console.log('Comment status:', commentRes.status, 'success:', commentRes.body.success);
    if (commentRes.body.data) {
      console.log('Comment text:', commentRes.body.data.text, 'by:', commentRes.body.data.author?.username);
    }

    // Test save
    console.log('\n--- Testing Save on post:', postId);
    const saveRes = await makeReq('/posts/' + postId + '/save', 'POST', null, token);
    console.log('Save status:', saveRes.status, 'success:', saveRes.body.success, 'message:', saveRes.body.message);

    // Test share
    console.log('\n--- Testing Share on post:', postId);
    const shareRes = await makeReq('/posts/' + postId + '/share', 'POST', null, token);
    console.log('Share status:', shareRes.status, 'success:', shareRes.body.success);
    if (shareRes.body.data) {
      console.log('Share URL:', shareRes.body.data.shareableUrl, 'Count:', shareRes.body.data.shareCount);
    }
  }
}

run().catch(e => console.error('Error:', e.message));
