export default function handler(req, res) {
  const serverTime = new Date();
  res.status(200).json({
    serverTime: serverTime.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    offset: -serverTime.getTimezoneOffset() / 60,
  });
}
