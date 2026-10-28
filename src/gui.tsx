import { Plugin } from "@opencode/plugin/gui"
import { For, Show, createMemo } from "solid-js"
import { Command, Panel } from "@opencode/plugin/gui"

export default Plugin.define({
  setup(ctx) {
    ctx.add(Command, () => ({
      id: "crewbee.activity",
      title: "CrewBee: agent activity",
      run: () => {
        const session = ctx.sessions.current()
        if (session) {
          ctx.layout.open(ctx.id + ":crewbee-activity", session, { tab: "open" })
        }
      },
    }))

    ctx.add(Panel, {
      id: "crewbee-activity",
      region: "side",
      list: (input) => [
        {
          id: "crewbee-activity",
          title: "CrewBee activity",
          label: (state) => (
            <span>{"CrewBee (" + (ctx.sessions.current()?.background.length ?? 0) + ")"}</span>
          ),
        },
      ],
      render: (props) => <CrewBeeActivityPanel ctx={ctx} session={props.session} />,
    })
  },
})

function CrewBeeActivityPanel(props: { ctx: any; session: any }) {
  const background = () => props.session.background ?? []

  const allBackground = createMemo(() =>
    props.ctx.sessions
      .list()
      .map((s: any) => ({ session: s, tasks: [] as any[] }))
  )

  return (
    <div style={{ padding: "8px", display: "flex", "flex-direction": "column", gap: "8px" }}>
      <h3>{"CrewBee — agenti al lavoro"}</h3>

      <Show when={background().length === 0}>
        <p>Nessun agente in background per questa sessione.</p>
      </Show>

      <For each={background()}>
        {(task: any) => (
          <div style={{ "padding-left": "8px", display: "flex", "flex-direction": "column", gap: "2px" }}>
            <strong>
              {task.type === "subagent" ? (task.agent ?? "subagent") : "shell"}
            </strong>
            <span style={{ "font-size": "12px", opacity: 0.7 }}>{task.label}</span>
          </div>
        )}
      </For>

      <hr style={{ opacity: 0.3 }} />

      <h4>{"Sessioni aperte (" + props.ctx.sessions.list().length + ")"}</h4>
      <For each={props.ctx.sessions.list()}>
        {(s: any) => (
          <div style={{ "padding-left": "8px" }}>
            {"• " + s.id.slice(0, 8) + (s.pending ? " (pending)" : "")}
          </div>
        )}
      </For>

      <p style={{ "font-size": "11px", opacity: 0.5 }}>Esc per chiudere il pannello.</p>
    </div>
  )
}