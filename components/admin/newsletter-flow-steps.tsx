import styles from "./newsletter-flow-steps.module.css";

export type NewsletterFlowStepId = "start" | "build" | "review" | "send";

export type NewsletterFlowStep = {
  id: NewsletterFlowStepId;
  title: string;
  description: string;
};

export const NEWSLETTER_FLOW_STEPS: readonly NewsletterFlowStep[] = [
  { id: "start", title: "Starting point", description: "Blank or existing" },
  { id: "build", title: "Build with AI", description: "Iterate and preview" },
  { id: "review", title: "Review & polish", description: "Studio preview" },
  { id: "send", title: "Send", description: "Recipients & delivery" },
] as const;

const STEP_ORDER: readonly NewsletterFlowStepId[] = NEWSLETTER_FLOW_STEPS.map((step) => step.id);

type NewsletterFlowStepsProps = {
  current: NewsletterFlowStepId;
  ariaLabel?: string;
};

export function NewsletterFlowSteps({
  current,
  ariaLabel = "Newsletter workflow steps",
}: NewsletterFlowStepsProps) {
  const currentIndex = STEP_ORDER.indexOf(current);

  return (
    <ol className={styles.steps} aria-label={ariaLabel}>
      {NEWSLETTER_FLOW_STEPS.map((step, index) => {
        const stateClass =
          index === currentIndex ? styles.activeStep : index < currentIndex ? styles.completeStep : "";
        return (
          <li key={step.id} className={stateClass}>
            <span>{index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <small>{step.description}</small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
