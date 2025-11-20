// Settings layout - navigation is handled by parent profile layout
// This layout just wraps the content
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in">
      <div className="transition-all duration-200">
        {children}
      </div>
    </div>
  )
}

