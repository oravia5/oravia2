import re

path = "controllers/posts.controller.js"
with open(path) as f:
    content = f.read()

count_likes = content.count("export const getPostLikes = async")
count_dislikes = content.count("export const getPostDislikes = async")
print(f"getPostLikes occurrences: {count_likes}")
print(f"getPostDislikes occurrences: {count_dislikes}")

if count_likes <= 1 and count_dislikes <= 1:
    print("No duplicates found. Nothing to do.")
else:
    pattern = re.compile(
        r"/\*\*\n \* @desc    Get list of users who liked a post.*?"
        r"export const getPostDislikes = async \(req, res\) => \{.*?\n\};\n\n",
        re.DOTALL
    )

    matches = list(pattern.finditer(content))
    print(f"Found {len(matches)} full like+dislike block(s) via regex")

    if len(matches) >= 2:
        first = matches[0]
        new_content = content[:first.end()]
        last_end = first.end()
        for m in matches[1:]:
            last_end = m.end()
        new_content += content[last_end:]

        with open(path, "w") as f:
            f.write(new_content)
        print("Deduplicated: kept 1 block, removed", len(matches) - 1, "duplicate(s)")
    else:
        print("Could not confidently isolate duplicate blocks — manual check needed")
