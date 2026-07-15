'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const registerServiceWorker = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log(
              'Service Worker registered:',
              registration.scope
            )
          })
          .catch((error) => {
            console.error(
              'Service Worker registration failed:',
              error
            )
          })
      }

      window.addEventListener('load', registerServiceWorker)

      return () => {
        window.removeEventListener('load', registerServiceWorker)
      }
    }
  }, [])

  return null
}