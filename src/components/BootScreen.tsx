type BootScreenProps = {
  message: string
  detail?: string
}

export function BootScreen({ message, detail }: BootScreenProps) {
  return (
    <div className="boot">
      <p className="boot__msg">{message}</p>
      {detail ? <p className="boot__detail">{detail}</p> : null}
    </div>
  )
}
