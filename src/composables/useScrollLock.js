export function useScrollLock() {
  function syncGalleryScrollLock(isOpen) {
    document.documentElement.classList.toggle('gallery-scroll-locked', isOpen)
    document.body.classList.toggle('gallery-scroll-locked', isOpen)
  }

  function syncModalScrollLock(galleryOpen, imagePreview) {
    const locked = galleryOpen || Boolean(imagePreview)
    document.documentElement.classList.toggle('gallery-scroll-locked', locked)
    document.body.classList.toggle('gallery-scroll-locked', locked)
  }

  return {
    syncGalleryScrollLock,
    syncModalScrollLock,
  }
}
