// Shared legal document body content. Used by both the standalone /legal/* pages
// and the in-wizard modal so they always stay in sync.

export function TermsOfServiceContent() {
  return (
    <>
      <p>
        Welcome to Fighter Journal. By creating an account or using the app, you agree to these
        Terms of Service.
      </p>
      <p>
        <strong>Personal use.</strong> Fighter Journal is provided for personal, lawful training
        tracking. You agree not to misuse the service, attempt to access other users' data, or
        use the platform for any illegal activity.
      </p>
      <p>
        <strong>Account security.</strong> You are responsible for keeping your account
        credentials secure and for all activity that happens under your account.
      </p>
      <p>
        <strong>Service availability.</strong> The app is currently in private testing and is
        provided on an "as-is" basis without warranties of any kind. Features may change or be
        removed without notice.
      </p>
      <p>
        <strong>Content.</strong> You retain ownership of the training data and notes you enter.
        You grant us a limited licence to store and process that data so the app can function.
      </p>
      <p>
        <strong>Termination.</strong> We may suspend or terminate accounts that breach these
        terms or that pose a risk to other users.
      </p>
      <p>
        <strong>Contact.</strong> Questions about these terms can be sent via the support page on{' '}
        <a
          href="https://thefighterjournal.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          thefighterjournal.com
        </a>
        .
      </p>
    </>
  );
}

export function PrivacyPolicyContent() {
  return (
    <>
      <p>
        This Privacy Policy explains what data Fighter Journal collects, how we use it, and the
        choices you have.
      </p>
      <p>
        <strong>What we collect.</strong> Account details (name, email, date of birth), the
        training sessions, techniques, motivation notes and profile data you enter, and basic
        technical logs needed to operate the service.
      </p>
      <p>
        <strong>How we use it.</strong> Your data is used solely to power the app for you — to
        store your sessions, generate your stats and pathway, and (where you choose) share
        selected information with a coach you have approved.
      </p>
      <p>
        <strong>Sharing.</strong> Your data is private to you. We never sell personal data. Data
        is only shared with a coach when you explicitly approve that connection.
      </p>
      <p>
        <strong>Storage and security.</strong> Data is stored on managed cloud infrastructure
        with strict per-user access controls (Row Level Security). Access is restricted to you
        and to coaches you authorise.
      </p>
      <p>
        <strong>Your rights.</strong> You can export or delete your data at any time from your
        profile settings. Deleting your account permanently removes your training records.
      </p>
      <p>
        <strong>Minors.</strong> Users aged 13–17 require verifiable parental or guardian consent
        before an account is created. Users under 13 are not permitted to use the service.
      </p>
    </>
  );
}

export function CookiePolicyContent() {
  return (
    <>
      <p>
        Fighter Journal uses a small number of cookies and local-storage items that are necessary
        for the app to function.
      </p>
      <p>
        <strong>Essential cookies.</strong> Used to keep you signed in, remember your selected
        mode (Athlete / Fighter / Coach), and protect against abuse via our security check
        provider.
      </p>
      <p>
        <strong>Preferences.</strong> We store your UI preferences (theme, custom lists,
        autosave drafts) in your browser's local storage so they persist between visits.
      </p>
      <p>
        <strong>What we do NOT use.</strong> We do not use advertising cookies, third-party
        tracking pixels, or cross-site behavioural advertising.
      </p>
      <p>
        <strong>Managing cookies.</strong> You can clear cookies and local storage at any time
        from your browser settings. Note that clearing essential cookies will sign you out and
        may reset unsaved drafts.
      </p>
    </>
  );
}
