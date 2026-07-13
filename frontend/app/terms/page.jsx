import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Campus Market',
  description: 'Terms of Service for Campus Market, the marketplace for Copperbelt institutions.',
};

function Section({ number, title, children }) {
  return (
    <section className="border-t border-border pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <h2 className="text-xl font-bold tracking-tight text-foreground">
        {number}. {title}
      </h2>
      <div className="mt-3 space-y-3 text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm">
        <div className="mb-8">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Legal
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Campus Market — Last updated: July 2026</p>
        </div>

        <Section number={1} title="Acceptance of Terms">
          <p>
            By creating an account, browsing listings, or otherwise using Campus Market
            (&ldquo;the Platform,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;), you agree to be bound by these Terms of
            Service. If you do not agree, do not use the Platform. If you are under 18, you may only use the
            Platform with the consent and supervision of a parent or guardian.
          </p>
        </Section>

        <Section number={2} title="What Campus Market Is">
          <p>
            Campus Market is a peer-to-peer marketplace connecting students and locals affiliated with
            participating Copperbelt institutions (including CBU, TEVET, and ZUT) to buy and sell goods. Campus
            Market is <strong>not</strong> a party to any transaction between users. We do not own, inspect,
            warehouse, or ship listed items, and we do not process payments between buyers and sellers.
          </p>
        </Section>

        <Section number={3} title="Accounts">
          <ul className="list-disc pl-5 space-y-2">
            <li>You must provide accurate registration information and keep your account credentials confidential.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>We may require verification of institutional affiliation (e.g. student email or ID) to grant certain account features.</li>
            <li>One account per person. Accounts found to be fraudulent, duplicated, or created to evade a suspension may be terminated without notice.</li>
          </ul>
        </Section>

        <Section number={4} title="Listings">
          <ul className="list-disc pl-5 space-y-2">
            <li>Free accounts may post up to <strong>5 active listings</strong> at a time (or as otherwise stated in-app).</li>
            <li>Listings must be accurate: correct price (in ZMW), condition, and description of the item. Misleading listings may be removed.</li>
            <li>
              Prohibited items include (non-exhaustive): weapons, illegal drugs or drug paraphernalia, counterfeit
              goods, stolen property, academic work for sale in violation of institutional integrity policies (e.g.
              paid essay-writing, exam answers), live animals, and anything illegal under Zambian law.
            </li>
            <li>
              Content that violates the <strong>Cyber Security and Cyber Crimes Act, 2021</strong> — including
              material that advocates or incites hatred, discrimination, or violence on the basis of race, colour,
              descent, or national or ethnic origin, or any content related to child exploitation — is strictly
              prohibited and will be reported to the relevant authorities in addition to being removed.
            </li>
            <li>We reserve the right to remove any listing, at our discretion, that violates these Terms or that our automated fraud checks flag for manual review.</li>
          </ul>
        </Section>

        <Section number={5} title="Fees">
          <p>
            Posting and browsing are currently free. If we introduce paid tiers, promoted listings, or transaction
            fees in the future, we will provide notice in-app before charging you anything.
          </p>
        </Section>

        <Section number={6} title="Conduct">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Circumvent in-app chat to conduct transactions off-platform in a way intended to evade fraud protections (e.g. sharing contact info specifically to bypass moderation before a first trade).</li>
            <li>Harass, threaten, or discriminate against other users.</li>
            <li>Use the Platform to scrape data, run bots, or interfere with normal operation.</li>
            <li>Impersonate another person or institution.</li>
            <li>
              Attempt to circumvent rate limits, security controls, or Row Level Security policies protecting other
              users&rsquo; data.
            </li>
            <li>
              Gain or attempt to gain unauthorized access to the Platform&rsquo;s systems, intercept communications,
              introduce malicious software, or otherwise engage in conduct prohibited under the{' '}
              <strong>Cyber Security and Cyber Crimes Act, 2021</strong>. Such conduct is a criminal offence under
              Zambian law, independent of any action we take, and may be reported to the Zambia Computer Incidence
              Response Team (ZM-CIRT) or the Zambia Information and Communications Technology Authority (ZICTA).
            </li>
          </ul>
        </Section>

        <Section number={7} title="Transactions Between Users">
          <p>All sales are agreements directly between buyer and seller. Campus Market:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Does not guarantee the quality, safety, or legality of items listed by users.</li>
            <li>Does not mediate payment disputes, since payment happens outside the Platform (cash or user-arranged transfer) unless we explicitly launch an in-app payment feature.</li>
            <li>Strongly recommends meeting in safe, public, on-campus locations for exchanges.</li>
          </ul>
          <p>
            We provide basic automated fraud signals (e.g. flagging suspiciously low prices or new accounts) as a
            convenience, not a guarantee of a scam-free transaction. Users trade at their own risk.
          </p>
        </Section>

        <Section number={8} title="Content You Post">
          <p>
            You retain ownership of content (text, images) you upload, but grant Campus Market a non-exclusive,
            royalty-free license to host, display, and resize/transform that content (e.g. for thumbnails) as
            necessary to operate the Platform. You confirm you have the right to post any image or content you
            upload.
          </p>
        </Section>

        <Section number={9} title="Moderation & Enforcement">
          <p>
            We may remove content, suspend, or terminate accounts that violate these Terms, at our discretion, with
            or without notice, particularly in cases of fraud, harassment, or repeated policy violations. Flagged
            listings go into manual review rather than automatic deletion, except in clear cases of illegal content.
          </p>
        </Section>

        <Section number={10} title="Electronic Transactions & Records">
          <p>
            By using the Platform, you acknowledge that account registration, listing creation, in-app messages, and
            other actions taken electronically are legally valid and enforceable records between you and Campus
            Market, as recognized under the <strong>Electronic Communications and Transactions Act No. 4 of 2021</strong>.
            Electronic signatures or confirmations you provide in-app (e.g. accepting these Terms at registration)
            carry the same legal weight as a signed physical document.
          </p>
        </Section>

        <Section number={11} title="Data Protection">
          <p>
            Your personal data is collected and processed in accordance with our{' '}
            <Link href="/policies" className="text-primary hover:underline">Privacy Policy</Link>, which is written
            to comply with the <strong>Data Protection Act No. 3 of 2021</strong>. This includes your rights to
            access, correct, and request deletion of your personal data, and our obligations around lawful
            processing, data retention, and breach notification to the Office of the Data Protection Commissioner.
          </p>
        </Section>

        <Section number={12} title="Disclaimers">
          <p>
            The Platform is provided &ldquo;as is.&rdquo; We do not warrant uninterrupted or error-free operation. To
            the fullest extent permitted by Zambian law, Campus Market disclaims liability for losses arising from
            transactions between users, including fraud, misrepresentation, or failed exchanges.
          </p>
        </Section>

        <Section number={13} title="Limitation of Liability">
          <p>
            To the extent permitted by law, Campus Market&rsquo;s total liability to you for any claim arising from
            use of the Platform is limited to the amount (if any) you paid us in the preceding 12 months.
          </p>
        </Section>

        <Section number={14} title="Cooperation with Authorities">
          <p>
            We may disclose account or listing information to Zambian law enforcement, ZICTA, or the Data Protection
            Commissioner where required by a lawful order (e.g. a High Court order under the Cyber Security and
            Cyber Crimes Act, 2021) or where necessary to investigate suspected illegal activity on the Platform.
          </p>
        </Section>

        <Section number={15} title="Changes to These Terms">
          <p>
            We may update these Terms from time to time. Continued use of the Platform after changes take effect
            constitutes acceptance of the revised Terms. Material changes will be flagged in-app.
          </p>
        </Section>

        <Section number={16} title="Governing Law">
          <p>
            These Terms are governed by the laws of the Republic of Zambia, including but not limited to the
            Electronic Communications and Transactions Act No. 4 of 2021, the Cyber Security and Cyber Crimes Act
            No. 2 of 2021, the Data Protection Act No. 3 of 2021, and the Information and Communications
            Technologies Act No. 15 of 2009. Disputes shall be subject to the jurisdiction of the courts of Zambia.
          </p>
        </Section>

        <Section number={17} title="Contact">
          <p>
            Questions about these Terms can be sent to{' '}
            <a href="mailto:support@campusmarket.example" className="text-primary hover:underline">
              support@campusmarket.example
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}