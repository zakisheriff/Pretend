import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function are injected into the global HTML structure.
export default function Root({ children }: PropsWithChildren) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
                {/* Link the PWA manifest file. */}
                <link rel="manifest" href="/manifest.json" />
                <link rel="apple-touch-icon" href="/icon.jpeg" />

                {/* Sets the browser address bar color to black */}
                <meta name="theme-color" content="#000000" />

                {/* iOS Web App Status Bar */}
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

                {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
                <ScrollViewStyleReset />

                <style dangerouslySetInnerHTML={{
                    __html: `
          body { 
            background-color: #000000; 
            /* Fix for iOS Safari overscroll/elastic scroll showing white */
            overscroll-behavior-y: none;
          }
        `}} />
            </head>
            <body>{children}</body>
        </html>
    );
}
