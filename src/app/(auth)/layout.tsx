import { FilmReel } from "@phosphor-icons/react/dist/ssr";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FilmReel className="h-6 w-6 text-primary" weight="duotone" />
        </div>
        <span className="font-heading text-2xl font-bold tracking-tight text-foreground">
          ReelFlow
        </span>
      </div>

      {/* Form content */}
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
