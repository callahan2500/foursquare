function HowToUse() {
  return (
    <div className="settings">
      <h1>How to Use</h1>

      <section className="settings-section">
        <div className="guide-step">
          <p>
            It's easy to feel overwhelmed when everything feels important.
            FourSquare helps you sort your tasks into four groups so you can
            see what to work on first, what to plan for later, and what to
            let go of. Here's how to get started.
          </p>
        </div>
      </section>

      <section className="settings-section">
        <h2>1. Add a Task</h2>
        <div className="guide-step">
          <p>
            Click <strong>"+ Add Task"</strong> at the top of the page, or
            use the button inside any quadrant. Type in a title and choose
            which quadrant it belongs in. Not sure where it goes? Click
            {' '}<strong>"Help me decide"</strong> and answer two quick questions
            to find the right spot.
          </p>
        </div>
      </section>

      <section className="settings-section">
        <h2>2. Sort the Unsorted Tray</h2>
        <div className="guide-step">
          <p>
            If you skip choosing a quadrant, your task goes to
            the <strong>Unsorted</strong> tray at the bottom. When you have a
            minute, drag each task into the quadrant where it fits best, or
            click on it to pick one.
          </p>
        </div>
      </section>

      <section className="settings-section">
        <h2>3. Understand the Quadrants</h2>
        <div className="guide-step">
          <div className="guide-quadrant-grid">
            <div className="onboarding-quadrant">
              <div className="onboarding-q-label q-label-q1">Q1 — Do Now</div>
              <div className="onboarding-q-desc">Urgent and important. These need your attention right away.</div>
            </div>
            <div className="onboarding-quadrant">
              <div className="onboarding-q-label q-label-q2">Q2 — Schedule</div>
              <div className="onboarding-q-desc">Important but not urgent. Set aside time for these — they help you reach your bigger goals.</div>
            </div>
            <div className="onboarding-quadrant">
              <div className="onboarding-q-label q-label-q3">Q3 — Delegate</div>
              <div className="onboarding-q-desc">Urgent but not important. Hand these off if you can, or just knock them out quickly — don't give them your best focus.</div>
            </div>
            <div className="onboarding-quadrant">
              <div className="onboarding-q-label q-label-q4">Q4 — Eliminate</div>
              <div className="onboarding-q-desc">Not urgent and not important. These are distractions — try to drop them.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>4. Organize & Prioritize</h2>
        <div className="guide-step">
          <p>
            <strong>Drag tasks up or down</strong> inside a quadrant to put the
            most important ones on top. Add <strong>tags</strong>,{' '}
            <strong>effort sizes</strong>, and <strong>due dates</strong> so you
            can see what each task involves at a glance. You can also set
            {' '}<strong>quadrant limits</strong> in matrix settings to keep
            yourself from piling too many tasks into one group.
          </p>
        </div>
      </section>

      <section className="settings-section">
        <h2>5. Review & Maintain</h2>
        <div className="guide-step">
          <p>
            Once a week, open <strong>Weekly Review</strong> to clean up old
            tasks and see what you've finished. Check <strong>Insights</strong>
            {' '}to spot patterns in how you work. And if there's something you
            want to do on a regular schedule, set up
            a <strong>recurring task</strong> so it comes back automatically.
          </p>
        </div>
      </section>
    </div>
  )
}

export default HowToUse
