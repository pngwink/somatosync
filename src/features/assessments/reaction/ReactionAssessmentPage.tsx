import { PageHeader } from "../../../components/shared/PageHeader";
import { Panel } from "../../../components/shared/Panel";
import { useReactionAssessment } from "./useReactionAssessment";
import { ReactionInstructions } from "./ReactionInstructions";
import { ReactionSymptomCheck } from "./ReactionSymptomCheck";
import { ReactionReadyGate } from "./ReactionReadyGate";
import { ReactionTrial } from "./ReactionTrial";
import { ReactionResults } from "./ReactionResults";
import { describeTrialFeedback } from "./reactionEngine";

export function ReactionAssessmentPage() {
  const engine = useReactionAssessment();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Reaction Time" context="A short, objective assessment of visual response speed." />

      <Panel title={panelTitle(engine.phase)}>
        {engine.phase === "instructions" && <ReactionInstructions onBegin={engine.begin} />}

        {engine.phase === "preCheck" && <ReactionSymptomCheck mode="pre" onSubmitPre={engine.submitPreCheck} />}

        {engine.phase === "practiceReady" && (
          <ReactionReadyGate
            heading="Ready for two practice trials"
            description="These trials help you get used to the test and are not scored. Focus on the shape below and respond as soon as it changes."
            buttonLabel="Start practice trials"
            onStart={engine.startPracticeBlock}
          />
        )}

        {(engine.phase === "waiting" || engine.phase === "stimulus") && (
          <ReactionTrial
            displayPhase={engine.phase}
            trialKind={engine.trialKind}
            trialNumber={engine.trialNumber}
            totalForKind={engine.totalForKind}
            feedbackText={null}
            onRespond={engine.respond}
          />
        )}

        {engine.phase === "trialFeedback" && engine.lastTrial && (
          <ReactionTrial
            displayPhase="trialFeedback"
            trialKind={engine.lastTrial.phase}
            trialNumber={engine.lastTrial.trialNumber}
            totalForKind={engine.lastTrial.phase === "practice" ? 2 : 10}
            feedbackText={describeTrialFeedback(engine.lastTrial.status, engine.lastTrial.phase)}
            onRespond={engine.respond}
          />
        )}

        {engine.phase === "scoredReady" && (
          <ReactionReadyGate
            heading="Practice complete"
            description="The next ten trials will be recorded. Stay focused on the shape and respond as soon as it changes."
            buttonLabel="Start scored trials"
            onStart={engine.startScoredBlock}
          />
        )}

        {engine.phase === "postCheck" && <ReactionSymptomCheck mode="post" onSubmitPost={engine.submitPostCheck} />}

        {engine.phase === "results" && engine.result && (
          <ReactionResults result={engine.result} onRetake={engine.restart} />
        )}
      </Panel>
    </div>
  );
}

function panelTitle(phase: string): string {
  switch (phase) {
    case "instructions":
      return "Instructions";
    case "preCheck":
      return "Before you begin";
    case "practiceReady":
      return "Practice";
    case "waiting":
    case "stimulus":
    case "trialFeedback":
      return "Reaction Time Assessment";
    case "scoredReady":
      return "Practice complete";
    case "postCheck":
      return "After the test";
    case "results":
      return "Results";
    default:
      return "Reaction Time";
  }
}
