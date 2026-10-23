/** Turns transport errors into something a visitor can act on. Before the first SettingsApplied,
 *  a closed socket almost always means the key: wrong, revoked, or missing Voice Agent access. */
export function friendlyError(raw: string, callStarted: boolean): string {
  if (!callStarted && /socket closed|open timeout|401|403|unauthori[sz]ed|forbidden/i.test(raw)) {
    return 'Deepgram closed the connection before the call started. Check that the key is pasted in full and belongs to a project with Voice Agent access, then use a different key.'
  }
  if (/permission|NotAllowedError|microphone/i.test(raw)) {
    return 'The page needs your microphone. Allow it in the browser address bar, then start the call again.'
  }
  return callStarted ? `The call dropped: ${raw}` : raw
}
