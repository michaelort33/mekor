import Link from "next/link";

import { SectionCard } from "@/components/marketing/primitives";
import {
  SPECIAL_DAVENING_SCHEDULES,
  splitSpecialDaveningSchedules,
  type SpecialDaveningSchedule,
} from "@/lib/davening/special-schedules";
import styles from "./page.module.css";

function ScheduleTimetable({ schedule, archived = false }: { schedule: SpecialDaveningSchedule; archived?: boolean }) {
  return (
    <article className={styles.specialSchedule} data-archived={archived ? "true" : "false"}>
      <header className={styles.specialScheduleHeader}>
        <div>
          <p className={styles.specialScheduleDate}>{schedule.dateLabel}</p>
          <h3>{schedule.title}</h3>
        </div>
        <Link href={schedule.href}>Full schedule details →</Link>
      </header>

      <p className={styles.specialScheduleNote}>{schedule.note}</p>

      <div className={styles.specialScheduleDays}>
        {schedule.days.map((day) => (
          <section key={day.dayLabel} className={styles.specialScheduleDay} aria-label={day.dayLabel}>
            <h4>{day.dayLabel}</h4>
            <ol>
              {day.items.map((item) => (
                <li key={`${day.dayLabel}-${item.time}-${item.label}`}>
                  <time>{item.time}</time>
                  <span>{item.label}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </article>
  );
}

export function SpecialDaveningSchedules({ now = new Date() }: { now?: Date }) {
  const { upcoming, past } = splitSpecialDaveningSchedules(SPECIAL_DAVENING_SCHEDULES, now);

  return (
    <SectionCard className={`${styles.sectionCard} ${styles.specialSchedulesCard}`}>
      <header className={styles.specialSchedulesIntro}>
        <div>
          <p className={styles.scheduleEyebrow}>Service-time exceptions</p>
          <h2 className={styles.scheduleTitle}>Special davening schedules</h2>
        </div>
        <p>
          Holiday and fast-day times take priority over the regular weekly schedule on the dates shown.
        </p>
      </header>

      {upcoming.length > 0 ? (
        <div className={styles.specialSchedulesUpcoming}>
          {upcoming.map((schedule) => (
            <ScheduleTimetable key={schedule.id} schedule={schedule} />
          ))}
        </div>
      ) : null}

      {past.length > 0 ? (
        <details className={styles.pastSpecialSchedules}>
          <summary>
            <span>Past special schedules</span>
            <span>{past.length}</span>
          </summary>
          <div className={styles.pastSpecialSchedulesBody}>
            {past.map((schedule) => (
              <ScheduleTimetable key={schedule.id} schedule={schedule} archived />
            ))}
          </div>
        </details>
      ) : null}
    </SectionCard>
  );
}
