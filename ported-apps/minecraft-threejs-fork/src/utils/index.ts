// TSYNE: Original used DOM APIs (document.createElement, navigator.userAgent).
// Stubbed — no DOM in tsyne.

/* Original code:
export const htmlToDom = (html: string) => {
  const templateDom = document.createElement('template')
  templateDom.innerHTML = html
  window.document.body.appendChild(templateDom.content)
}

export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(
  navigator.userAgent
)
*/

export const htmlToDom = (_html: string) => {}
export const isMobile = false
