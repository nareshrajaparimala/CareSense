import Link from 'next/link';
import { ArrowLeft, Github, Linkedin, Phone, Sparkles } from 'lucide-react';

type TeamMember = {
  name: string;
  role: string;
  affiliations: string[];
  phone: string;
  linkedin: string;
  github: string;
  photo?: string;
};

const TEAM: TeamMember[] = [
  {
    name: 'Naresh.R',
    role: '4th Year Student at MSEC',
    affiliations: ['Product Engineer at Gostudio.ai'],
    phone: '8884509528',
    linkedin: 'https://linkedin.com/in/naresh-raja-895477276',
    github: 'https://github.com/nareshrajaparimala'
    // photo: '/team/naresh.jpg'
  },
  {
    name: 'Chinmayi V. V.',
    role: '4th Year Student at MSEC',
    affiliations: ['Project Intern (Researcher) at IIIT-B'],
    phone: '7676174764',
    linkedin: 'https://www.linkedin.com/in/chinmayi-v-gowda/',
    github: 'https://github.com/chinmayi-vishwanath'
    // photo: '/team/chinmayi.jpg'
  }
];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1E3FBF] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <header className="mt-6 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-[#1E3FBF] shadow-sm">
            <Sparkles className="h-3 w-3" />
            Meet the team
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            We built CareSense for you.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Reach out for product feedback, partnerships, or technical questions.
          </p>
        </header>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          {TEAM.map((m) => (
            <ProfileCard key={m.name} member={m} />
          ))}
        </section>

        <footer className="mt-12 text-center text-xs text-muted-foreground">
          <p>
            Need urgent product help? Email <span className="font-semibold">caresense@team.dev</span> or use any
            contact above.
          </p>
        </footer>
      </div>
    </main>
  );
}

function ProfileCard({ member }: { member: TeamMember }) {
  const initials = member.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <article className="group relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-[#1E3FBF] to-[#3B82F6]" />

      <div className="relative">
        <div className="flex items-center justify-center">
          <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-blue-100 shadow-lg ring-1 ring-black/5">
            {member.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.photo}
                alt={member.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-[#1E3FBF]">
                {initials}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-xl font-bold tracking-tight">{member.name}</h2>
          <p className="mt-1 text-sm font-medium text-[#1E3FBF]">{member.role}</p>
          {member.affiliations.map((a) => (
            <p key={a} className="text-xs text-muted-foreground">{a}</p>
          ))}
        </div>

        <div className="mt-5 space-y-2 border-t pt-4 text-sm">
          <ContactRow icon={Phone} label="Phone" value={member.phone} href={`tel:${member.phone}`} />
          <ContactRow
            icon={Linkedin}
            label="LinkedIn"
            value={member.linkedin.replace(/^https?:\/\//, '')}
            href={member.linkedin}
            external
          />
          <ContactRow
            icon={Github}
            label="GitHub"
            value={member.github.replace(/^https?:\/\//, '')}
            href={member.github}
            external
          />
        </div>

        <div className="mt-5 flex justify-center gap-3">
          <a
            href={member.linkedin}
            target="_blank"
            rel="noreferrer"
            aria-label={`${member.name} on LinkedIn`}
            className="flex h-10 w-10 items-center justify-center rounded-full border bg-white text-[#0A66C2] shadow-sm transition hover:scale-110 hover:bg-[#0A66C2] hover:text-white"
          >
            <Linkedin className="h-4 w-4" />
          </a>
          <a
            href={member.github}
            target="_blank"
            rel="noreferrer"
            aria-label={`${member.name} on GitHub`}
            className="flex h-10 w-10 items-center justify-center rounded-full border bg-white text-gray-900 shadow-sm transition hover:scale-110 hover:bg-gray-900 hover:text-white"
          >
            <Github className="h-4 w-4" />
          </a>
          <a
            href={`tel:${member.phone}`}
            aria-label={`Call ${member.name}`}
            className="flex h-10 w-10 items-center justify-center rounded-full border bg-white text-emerald-600 shadow-sm transition hover:scale-110 hover:bg-emerald-600 hover:text-white"
          >
            <Phone className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
  external
}: {
  icon: any;
  label: string;
  value: string;
  href: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className="flex items-center gap-3 rounded-md px-2 py-1.5 transition hover:bg-blue-50"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#1E3FBF]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-sm font-medium">{value}</div>
      </div>
    </a>
  );
}
