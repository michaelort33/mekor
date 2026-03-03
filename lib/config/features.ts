export function isFeatureEnabled(name: "FEATURE_DUES" | "FEATURE_EVENT_SIGNUPS" | "FEATURE_PUBLIC_DIRECTORY") {
  return process.env[name] === "true";
}

export function featureDisabledResponse(feature: "FEATURE_DUES" | "FEATURE_EVENT_SIGNUPS" | "FEATURE_PUBLIC_DIRECTORY") {
  return {
    error: `${feature} is disabled`,
  };
}
