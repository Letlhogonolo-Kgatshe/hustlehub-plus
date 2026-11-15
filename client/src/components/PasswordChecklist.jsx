import { PASSWORD_RULES } from '../passwordRules'

export default function PasswordChecklist({ password, id }) {
  return (
    <ul id={id} className="pw-rules" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password)
        return (
          <li key={rule.id} className={ok ? 'pw-ok' : ''}>
            <span aria-hidden="true">{ok ? '\u2713' : '\u25CB'}</span> {rule.label}
            <span className="sr-only">{ok ? ' (met)' : ' (not met)'}</span>
          </li>
        )
      })}
    </ul>
  )
}