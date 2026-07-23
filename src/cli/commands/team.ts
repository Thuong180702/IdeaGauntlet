/**
 * F-13: Team CLI command — submit, vote, comment, list ideas.
 * Usage:
 *   idea-gauntlet team submit <idea> --user <name>
 *   idea-gauntlet team vote <idea> --user <name> --score <1-10> [--comment <text>]
 *   idea-gauntlet team comment <idea> --user <name> --text <text>
 *   idea-gauntlet team list
 *   idea-gauntlet team show <idea>
 */

import {
  submitIdea, voteOnIdea, commentOnIdea, listIdeas,
  getReview, formatTeamReview, updateStatus,
} from "../../core/teamReview.js";

export async function teamCommand(
  action: string,
  ideaArg: string | undefined,
  options: Record<string, unknown>,
): Promise<void> {
  const user = options.user as string ?? "anonymous";
  const score = options.score as number | undefined;
  const comment = options.comment as string | undefined;
  const text = options.text as string | undefined;

  switch (action) {
    case "submit": {
      if (!ideaArg) { console.error("Missing idea text"); process.exit(1); }
      const review = submitIdea(ideaArg, user);
      console.log(`Idea submitted.\n${formatTeamReview(review)}`);
      break;
    }

    case "vote": {
      if (!ideaArg) { console.error("Missing idea text"); process.exit(1); }
      if (!score || score < 1 || score > 10) {
        console.error("Score must be 1-10 via --score");
        process.exit(1);
      }
      // Ensure idea exists first
      submitIdea(ideaArg, user);
      voteOnIdea(ideaArg, user, score, comment as string);
      const review = getReview(ideaArg);
      if (review) console.log(formatTeamReview(review));
      break;
    }

    case "comment": {
      if (!ideaArg) { console.error("Missing idea text"); process.exit(1); }
      if (!text) { console.error("Missing comment text via --text"); process.exit(1); }
      submitIdea(ideaArg, user);
      commentOnIdea(ideaArg, user, text);
      const review = getReview(ideaArg);
      if (review) console.log(formatTeamReview(review));
      break;
    }

    case "list": {
      const ideas = listIdeas();
      if (ideas.length === 0) {
        console.log("No ideas submitted yet.");
        return;
      }
      console.log("\n👥 Team Ideas\n");
      for (const r of ideas) {
        const votes = r.votes.length;
        const score = r.consensusScore ?? "-";
        const idea = r.ideaText.length > 60 ? r.ideaText.slice(0, 57) + "..." : r.ideaText;
        console.log(`  [${r.status}]  Score: ${score}/10  Votes: ${votes}  ${idea}`);
      }
      console.log(`\n${ideas.length} idea(s) total.`);
      break;
    }

    case "show": {
      if (!ideaArg) { console.error("Missing idea text"); process.exit(1); }
      const review = getReview(ideaArg);
      if (!review) {
        console.error("Idea not found.");
        process.exit(1);
      }
      console.log(formatTeamReview(review));
      break;
    }

    case "archive": {
      if (!ideaArg) { console.error("Missing idea text"); process.exit(1); }
      updateStatus(ideaArg, "archived");
      console.log("Idea archived.");
      break;
    }

    default:
      console.error(`Unknown action: ${action}. Use: submit, vote, comment, list, show, archive`);
      process.exit(1);
  }
}
