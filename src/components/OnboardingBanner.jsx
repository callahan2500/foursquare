function OnboardingBanner({ onDismiss }) {
  return (
    <div className="onboarding-banner">
      <div className="onboarding-content">
        <h2 className="onboarding-title">How to use the Eisenhower Matrix</h2>
        <p className="onboarding-subtitle">
          Organize tasks by urgency and importance to focus on what truly matters.
        </p>
        <div className="onboarding-grid">
          <div className="onboarding-quadrant">
            <span className="onboarding-q-label q-label-q1">Do Now</span>
            <span className="onboarding-q-desc">Urgent &amp; important — handle these immediately.</span>
          </div>
          <div className="onboarding-quadrant">
            <span className="onboarding-q-label q-label-q2">Schedule</span>
            <span className="onboarding-q-desc">Important but not urgent — plan time for these.</span>
          </div>
          <div className="onboarding-quadrant">
            <span className="onboarding-q-label q-label-q3">Delegate</span>
            <span className="onboarding-q-desc">Urgent but not important — hand off if you can.</span>
          </div>
          <div className="onboarding-quadrant">
            <span className="onboarding-q-label q-label-q4">Eliminate</span>
            <span className="onboarding-q-desc">Neither urgent nor important — cut or minimize.</span>
          </div>
        </div>
        <button className="onboarding-dismiss" onClick={onDismiss}>Got it</button>
      </div>
    </div>
  )
}

export default OnboardingBanner
