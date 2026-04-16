export default function MembersPage() {
  return <RoutePlaceholder title="Members" body="Roster work starts here." />
}

function RoutePlaceholder({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 text-card-foreground">
      <p className="text-xs font-semibold uppercase text-primary">Next view</p>
      <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </section>
  )
}
