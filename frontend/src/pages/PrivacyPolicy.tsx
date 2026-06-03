import { Link } from 'react-router-dom';

const collectedData = [
  'Daily step count',
  'Distance, ascent, and altitude data for cycling sessions',
  'Active and total calorie expenditure',
  'Medium- and high-intensity activity duration',
  'Active hours per day',
  'Daily activity summaries',
  'Exercise goal completion data',
  'Cycling workout records including duration, distance, sport type, speed, and timestamps',
  'Historical activity and exercise data for trend analysis, subject to Huawei Health Service Kit availability and authorization limits',
];

const notCollected = [
  'Heart rate',
  'Sleep records',
  'Blood pressure',
  'Blood glucose',
  'SpO2',
  'Body temperature',
  'Stress levels',
  'ECG or other clinical health indicators',
];

const purposes = [
  'Visualizing cycling training history and session performance on a personal dashboard',
  'Analyzing weekly and monthly training load distribution',
  'Studying seasonal cycling patterns, including dry and rainy season comparisons in Indonesia',
  'Tracking long-term fitness progression through historical activity data',
  'Generating personal training and rest insights based on activity patterns',
];

export function PrivacyPolicy() {
  return (
    <LegalShell title="Privacy Policy" subtitle="Kemplu Cycling Analytics Dashboard" updated="Last updated: April 30, 2026 | Version 1.0">
      <Section title="1. Introduction">
        <p>
          Kemplu (&quot;the Application&quot;) is a personal cycling performance analytics dashboard developed for personal research and self-analysis. This Privacy Policy explains how the Application collects, uses, stores, and protects activity data obtained through Huawei Health Service Kit after explicit authorization with HUAWEI ID OAuth 2.0.
        </p>
        <p>By connecting your Huawei Health account to this Application, you agree to the practices described in this Privacy Policy.</p>
      </Section>

      <Section title="2. Data We Collect">
        <p>The Application accesses the following data from your Huawei Health account through the official Huawei Health Service Kit RESTful API after your authorization:</p>
        <BulletList items={collectedData} />
        <p className="mt-4">The Application does not intentionally collect the following sensitive or clinical health data:</p>
        <BulletList items={notCollected} />
      </Section>

      <Section title="3. Purpose of Data Collection">
        <p>All collected data is used exclusively for personal cycling analytics and research purposes:</p>
        <BulletList items={purposes} />
        <p className="mt-4">Data is not used for advertising, commercial profiling, third-party analytics, or purposes outside the personal research described above.</p>
      </Section>

      <Section title="4. Data Storage & Security">
        <BulletList
          items={[
            'Data retrieved from Huawei Health is stored on infrastructure controlled by the Application operator.',
            'API secrets and tokens are configured through environment variables and server-side storage.',
            'Data should be protected in transit with HTTPS/TLS in production deployments.',
            'Database and backup encryption should be enabled by the server operator before production use.',
            'The Application does not use third-party advertising or public analytics trackers.',
          ]}
        />
      </Section>

      <Section title="5. Data Sharing">
        <p>
          The Application does not sell, rent, or disclose Huawei Health activity data to third parties. Data is used only for the Application features described in this policy, unless disclosure is required by applicable law.
        </p>
      </Section>

      <Section title="6. Data Retention">
        <BulletList
          items={[
            'Data is retained while your Huawei Health account remains connected to the Application.',
            'You may revoke access through Huawei Health connected app settings at any time.',
            'You may request complete deletion of stored Application data by contacting the operator.',
            'After a valid deletion request, stored data will be purged within 30 days unless retention is legally required.',
          ]}
        />
      </Section>

      <Section title="7. Your Rights">
        <p>You may request access, correction, deletion, or withdrawal of consent for your stored Application data.</p>
        <p className="mt-4">To exercise these rights, contact: <a href="mailto:privacy@dari.asia">privacy@dari.asia</a></p>
      </Section>

      <Section title="8. No Medical Use">
        <p>
          This Application is not a medical device and does not provide medical diagnosis, clinical advice, or therapeutic recommendations. Analytics and suggestions are for personal sports research only. For health concerns, consult a qualified medical professional.
        </p>
      </Section>

      <Section title="9. Children&apos;s Privacy">
        <p>The Application is intended for adult users only (18+). It does not knowingly collect data from individuals under 18 years of age.</p>
      </Section>

      <Section title="10. Changes to This Privacy Policy">
        <p>The operator may update this Privacy Policy from time to time. Changes will be posted on this page with an updated version date. Continued use after changes constitutes acceptance of the updated policy.</p>
      </Section>

      <Section title="11. Contact">
        <p>For privacy inquiries, data requests, or concerns:</p>
        <p className="mt-3">Email: <a href="mailto:privacy@dari.asia">privacy@dari.asia</a></p>
        <p>Website: <a href="https://kemplu.com/privacy-policy">https://kemplu.com/privacy-policy</a></p>
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
