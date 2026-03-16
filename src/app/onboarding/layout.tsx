export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg">
        <h1 className="mb-8 text-center text-2xl font-bold text-foreground">
          Configura la tua azienda
        </h1>
        {children}
      </div>
    </div>
  );
}
