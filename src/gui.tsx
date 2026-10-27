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
        },
      ],
      render: (props) => (
        <CrewBeeActivityPanel ctx={ctx} />
      ),
    })
  },
})

function CrewBeeActivityPanel(props: { ctx: any }) {
  const sessions = () => props.ctx.sessions.list()

  return (
    <div style={{ padding: "8px", display: "flex", "flex-direction": "column", gap: "8px" }}>
      <h3>{"CrewBee — agenti al lavoro"}</h3>
      <Show when={sessions().length === 0}>
        <p>Nessun agente in esecuzione.</p>
      </Show>
      <For each={sessions()}>
        {(s: any) => (
          <div>
            <strong>{s.agent ?? "unknown"}</strong>
            {" — "}
            {s.title ?? s.id}
          </div>
        )}
      </For>
    </div>
  )
}