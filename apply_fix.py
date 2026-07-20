import re, sys

def patch(path, old, new, label):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if new in content:
        print(f"[skip] {label} already applied")
        return
    if old not in content:
        print(f"[FAIL] {label} - pattern not found, check file manually")
        sys.exit(1)
    content = content.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[ok] {label}")

base = "."

patch(
    f"{base}/backend/models/Notification.js",
    "enum: ['like', 'comment', 'follow', 'share', 'comment_like'],",
    "enum: ['like', 'dislike', 'comment', 'follow', 'share', 'comment_like'],",
    "Notification.js enum"
)

patch(
    f"{base}/backend/controllers/posts.controller.js",
    "    await post.save();\n    res.json({\n      success: true,\n      data: {\n        likes: post.likes,\n        dislikes: post.dislikes,\n      },\n    });\n  } catch (error) {\n    console.error(error);\n    res.status(500).json({\n      success: false,\n      message: 'Server error disliking post',",
    "    await post.save();\n\n    if (post.dislikes.some((id) => id.equals(userId))) {\n      createNotification({\n        recipient: post.author,\n        actor: userId,\n        type: 'dislike',\n        post: post._id,\n      });\n    }\n\n    res.json({\n      success: true,\n      data: {\n        likes: post.likes,\n        dislikes: post.dislikes,\n      },\n    });\n  } catch (error) {\n    console.error(error);\n    res.status(500).json({\n      success: false,\n      message: 'Server error disliking post',",
    "posts.controller.js dislikePost notification"
)

patch(
    f"{base}/backend/services/notification.service.js",
    ".populate('post', '_id mediaUrl type')",
    ".populate('post', '_id mediaUrl thumbnailUrl type')",
    "notification.service.js populate"
)

patch(
    f"{base}/frontend/src/pages/Notifications.jsx",
    "    case 'like': return 'liked your post';\n    case 'comment': return 'commented on your post';",
    "    case 'like': return 'liked your post';\n    case 'dislike': return 'disliked your post';\n    case 'comment': return 'commented on your post';",
    "Notifications.jsx text mapping"
)

patch(
    f"{base}/frontend/src/pages/Notifications.jsx",
    '    case \'like\': return <Heart size={16} fill="#f43f5e" color="#f43f5e" />;\n    case \'comment\': return <MessageCircle size={16} color="#3b82f6" />;',
    '    case \'like\': return <Heart size={16} fill="#f43f5e" color="#f43f5e" />;\n    case \'dislike\': return <Heart size={16} color="#71717a" style={{ transform: \'rotate(180deg)\' }} />;\n    case \'comment\': return <MessageCircle size={16} color="#3b82f6" />;',
    "Notifications.jsx icon mapping"
)

old_thumb = """                  {n.post?.mediaUrl && (
                    <div 
                      className="post-preview-thumbnail"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/post/${n.post._id || n.post}`);
                      }}
                    >
                      <img src={getFullMediaUrl(n.post.mediaUrl)} alt="Post preview" />
                    </div>
                  )}"""

new_thumb = """                  {n.post?.mediaUrl && (() => {
                    const previewSrc = n.post.type === 'photo'
                      ? n.post.mediaUrl
                      : (n.post.thumbnailUrl || null);

                    if (!previewSrc) return null;

                    return (
                      <div
                        className="post-preview-thumbnail"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/post/${n.post._id || n.post}`);
                        }}
                      >
                        <img src={getFullMediaUrl(previewSrc)} alt="Post preview" />
                      </div>
                    );
                  })()}"""

patch(
    f"{base}/frontend/src/pages/Notifications.jsx",
    old_thumb,
    new_thumb,
    "Notifications.jsx thumbnail block"
)

print("\nAll patches applied successfully.")
