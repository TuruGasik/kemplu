import { Link } from 'react-router-dom';

export function TermsOfService() {
  return (
    <LegalShell title="User Agreement" subtitle="Kemplu Cycling Analytics Dashboard" updated="Last updated: April 30, 2026 | Version 1.0">
      <Section title="1. Acceptance of Terms">
        <p>
          By accessing and using the Kemplu Cycling Analytics Dashboard (&quot;the Application&quot;), you agree to be bound by this User Agreement and Terms of Service (&quot;Agreement&quot;). If you do not agree, do not use the Application.
        </p>
      </Section>

      <Section title="2. Description of Service">
        <p>Kemplu is a personal research web application that connects to Huawei Health through the official Health Service Kit API to retrieve and visualize authorized cycling activity and fitness data. The Application provides:</p>
        <BulletList
          items={[
            'Personal cycling performance dashboard',
            'Historical activity trend analysis',
            'Training load and intensity distribution charts',
            'Goal completion and activity progress tracking',
            'Longitudinal fitness research tools',
          ]}
        />
      </Section>

      <Section title="3. Eligibility">
        <p>You must be at least 18 years old and have a valid Huawei ID account with Huawei Health data to use the Application. By using the Application, you represent that you meet these requirements.</p>
      </Section>

      <Section title="4. Huawei Health Data Authorization">
        <p>To use connected features, you must authorize access to your Huawei Health data through the official HUAWEI ID OAuth 2.0 consent flow. By authorizing:</p>
        <BulletList
          items={[
            'You grant the Application permission to read activity and exercise data described in the Privacy Policy.',
            'You confirm that the data being accessed belongs to you or that you have lawful authority to access it.',
            'You understand that Huawei Health cloud data may not be available in real time and may depend on Huawei Health synchronization.',
            'You may revoke authorization at any time through Huawei Health connected app settings.',
          ]}
        />
      </Section>

      <Section title="5. Permitted Use">
        <p>You may use the Application solely for personal, non-commercial research and self-analysis of your own cycling performance data.</p>
        <p className="mt-4">You may not:</p>
        <BulletList
          items={[
            'Share account access with unauthorized users.',
            'Use the Application for commercial services or third-party analytics.',
            'Reverse-engineer, scrape, overload, or misuse Huawei Health APIs through this Application.',
            'Use the Application to process another person’s health or activity data without valid consent.',
            'Attempt to bypass authentication, authorization, or security controls.',
          ]}
        />
      </Section>

      <Section title="6. No Medical Advice">
        <p>
          The Application does not provide medical advice, diagnosis, or treatment. Analytics, scores, and recommendations are for informational and personal sports research purposes only and should not be interpreted as medical guidance. Always consult a qualified healthcare provider for medical concerns.
        </p>
      </Section>

      <Section title="7. Disclaimer of Warranties">
        <p>The Application is provided &quot;as is&quot; without warranties of any kind. The developer does not guarantee:</p>
        <BulletList
          items={[
            'Uninterrupted or error-free operation',
            'Accuracy, completeness, or suitability of analytics outputs',
            'Continuous availability of Huawei Health API connectivity',
            'Availability of data that has not yet synchronized to Huawei Health cloud services',
          ]}
        />
      </Section>

      <Section title="8. Limitation of Liability">
        <p>
          To the maximum extent permitted by applicable law, the developer shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from use of the Application, including injuries, training decisions, health decisions, service interruption, or data loss.
        </p>
      </Section>

      <Section title="9. Termination">
        <p>The developer may suspend or terminate access to the Application at any time. You may stop using the Application at any time by revoking Huawei Health authorization and ceasing access.</p>
      </Section>

      <Section title="10. Governing Law">
        <p>This Agreement is governed by the laws of the Republic of Indonesia. Any disputes arising from this Agreement shall be resolved under Indonesian jurisdiction.</p>
      </Section>

      <Section title="11. Changes to This Agreement">
        <p>The developer may update these Terms at any time. Continued use of the Application after changes constitutes acceptance of the updated Terms. The latest version will be made available on this page.</p>
      </Section>

      <Section title="12. Contact">
        <p>For questions regarding these Terms:</p>
        <p className="mt-3">Email: <a href="mailto:legal@dari.asia">legal@dari.asia</a></p>
        <p>Website: <a href="https://training.dari.asia/terms-of-service">https://training.dari.asia/terms-of-service</a></p>
      </Section>
    </LegalShell>
  );
}

function LegalShell({ title, subtitle, updated, children }: { title: string; subtitle: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-200">
      <article className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-950/20 md:p-10">
        <Link to="/login" className="text-sm font-bold text-emerald-300 hover:text-emerald-200">← Back to Kemplu</Link>
        <header className="mt-8 border-b border-white/10 pb-8">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-emerald-300">{subtitle}</p>
          <h1 className="mt-4 text-4xl font-black text-white md:text-6xl">{title}</h1>
          <p className="mt-4 text-sm text-slate-400">{updated}</p>
        </header>
        <div className="mt-8 space-y-8 leading-7 [&_a]:font-bold [&_a]:text-emerald-300 [&_a:hover]:text-emerald-200">{children}</div>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-2xl font-black text-white">{title}</h2>
      <div className="space-y-3 text-slate-300">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-300">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}
