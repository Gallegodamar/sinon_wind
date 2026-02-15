import React from 'react';

type AppShellProps = {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  topRightControl?: React.ReactNode;
};

export const AppShell: React.FC<AppShellProps> = ({
  header,
  footer,
  children,
  contentClassName = '',
  topRightControl,
}) => {
  return (
    <div className="min-h-[100dvh] w-full p-4 safe-pt safe-px safe-pb">
      <div className="app-shell">
        {header ? (
          <header
            className={
              `app-shell__header ${topRightControl ? 'app-shell__header--with-control' : ''}`.trim()
            }
          >
            {header}
            {topRightControl ? (
              <div className="app-shell__header-control">{topRightControl}</div>
            ) : null}
          </header>
        ) : null}
        <main className={`app-shell__content custom-scrollbar ${contentClassName}`.trim()}>
          {children}
        </main>
        {footer ? <footer className="app-shell__footer">{footer}</footer> : null}
      </div>
    </div>
  );
};
