import Link from "next/link";

const rmtLogsPage = () => {
  return (
    <section>
      <h1>Logs</h1>
      <ul>
        <li>
          <Link href="/dashboard/rmt/logs/daily-logs">Daily Logs</Link>
        </li>
        <li>
          <Link href="/dashboard/rmt/logs/journal">Journal</Link>
        </li>
        <li>
          <Link href="/dashboard/rmt/logs/maintenance">Maintenance</Link>
        </li>
      </ul>
    </section>
  );
};

export default rmtLogsPage;
