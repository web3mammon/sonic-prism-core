export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t bg-background">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Klariqo. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
