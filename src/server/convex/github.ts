"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

export const fetchRepos = action({
  args: { githubToken: v.string() },
  handler: async (_ctx, args) => {
    const res = await fetch(
      "https://api.github.com/user/repos?per_page=100&type=all&sort=updated",
      {
        headers: {
          Authorization: `Bearer ${args.githubToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const repos = (await res.json()) as Array<{
      id: number;
      name: string;
      full_name: string;
      owner: { login: string };
      html_url: string;
      description: string | null;
      private: boolean;
      updated_at: string;
      language: string | null;
      stargazers_count: number;
    }>;

    return repos.map((repo) => ({
      repoId: repo.id,
      repoName: repo.name,
      repoOwner: repo.owner.login,
      repoUrl: repo.html_url,
      description: repo.description,
      isPrivate: repo.private,
      updatedAt: repo.updated_at,
      language: repo.language,
      stars: repo.stargazers_count,
    }));
  },
});

export const fetchCommits = action({
  args: {
    githubToken: v.string(),
    owner: v.string(),
    repo: v.string(),
    since: v.string(),
  },
  handler: async (_ctx, args) => {
    const res = await fetch(
      `https://api.github.com/repos/${args.owner}/${args.repo}/commits?since=${args.since}&per_page=30`,
      {
        headers: {
          Authorization: `Bearer ${args.githubToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const commits = (await res.json()) as Array<{
      sha: string;
      commit: {
        message: string;
        author: { name: string; date: string };
      };
      html_url: string;
    }>;

    return commits.map((c) => ({
      sha: c.sha.substring(0, 7),
      message: c.commit.message.split("\n")[0],
      author: c.commit.author.name,
      date: c.commit.author.date,
      url: c.html_url,
    }));
  },
});
