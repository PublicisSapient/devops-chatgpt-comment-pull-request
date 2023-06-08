import openai
import os
import requests
import sys
import json

openai.api_key = os.environ['OPENAI_API_KEY']  # Replace with your OpenAI API key

def generate_explanation(changes):
    prompt = f"Changes: {changes}\n\nExplain the changes:"

    response = openai.Completion.create(
        engine="text-davinci-003",
        prompt=prompt,
        max_tokens=200,
        temperature=0.7,
        n=1,
        stop=None,
        timeout=30,
    )

    explanation = response.choices[0].text.strip()
    return explanation

# Get the pull request information from GitHub API
pull_request_number = os.environ["PR_NUMBER"]
repository = os.environ["GITHUB_REPOSITORY"]
token = os.environ["GITHUB_TOKEN"]

# print the values for troubleshooting
# print("Pull Request Number:", pull_request_number)
# print("Repository:", repository)
# print("Token:", token)


pull_request_url = f"https://api.github.com/repos/{repository}/pulls/{pull_request_number}"
headers = {
    "Accept": "application/vnd.github.v3+json",
    "Authorization": f"Bearer {token}",
}

response = requests.get(pull_request_url, headers=headers)
pull_request_data = response.json()

# Retrieve the base and head commits
base_commit_sha = pull_request_data["base"]["sha"]
head_commit_sha = pull_request_data["head"]["sha"]

# Get the base and head commit data
commit_url = f"https://api.github.com/repos/{repository}/commits/"
base_commit_url = commit_url + base_commit_sha
head_commit_url = commit_url + head_commit_sha

response = requests.get(base_commit_url, headers=headers)
base_commit_data = response.json()

response = requests.get(head_commit_url, headers=headers)
head_commit_data = response.json()

# Retrieve the files changed between base and head commits
compare_url = f"https://api.github.com/repos/{repository}/compare/{base_commit_sha}...{head_commit_sha}"
response = requests.get(compare_url, headers=headers)
compare_data = response.json()

# Extract the code changes from the compare data
changes = compare_data["files"]

# Generate explanation using ChatGPT
explanation = generate_explanation(changes)

# Print or use the generated explanation as needed
print("\n".join(explanation.split("-")))
