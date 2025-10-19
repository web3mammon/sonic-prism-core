export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t bg-background">
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Klariqo. All Rights Reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="https://klariqo.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              klariqo.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
