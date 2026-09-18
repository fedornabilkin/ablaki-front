export function submitShortcut(event: KeyboardEvent, submit: () => void): void {
  if (event.key !== 'Enter' || (!event.ctrlKey && !event.metaKey) || event.isComposing || event.repeat) return;
  event.preventDefault();
  submit();
}
