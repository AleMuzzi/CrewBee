import { Plugin } from "@opencode/plugin/gui"
import { For, Show, createMemo, createResource } from "solid-js"
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
      render: (props) => <CrewBeeActivityPanel ctx={ctx} session={props.session} />,
    })
  },
})

function CrewBeeActivityPanel(props: { ctx: any; session: any }) {
  const background = () => props.session.background ?? []

  const [agents] = createResource(async () => {
    try {
      const res = await props.ctx.client.agent.list()
      const list = res?.data ?? res ?? []
      return (Array.isArray(list) ? list : []).filter((a: any) =>
        String(a.id ?? a.name ?? "").startsWith("coding-")
      )
    } catch (e) {
      return []
    }
  })

  const [sessions] = createResource(async () => {
    try {
      const res = await props.ctx.client.session.list()
      const list = res?.data ?? res ?? []
      return Array.isArray(list) ? list : []
    } catch (e) {
      return []
    }
  })

  const [models] = createResource(async () => {
    try {
      const res = await props.ctx.client.model.list()
      const list = res?.data ?? res ?? []
      return Array.isArray(list) ? list : []
    } catch (e) {
      return []
    }
  })

  const [currentModel, setCurrentModel] = createResource(async () => {
    try {
      const s = await props.ctx.client.session.get({ path: { id: props.session.id } })
      const info = s?.data ?? s
      return info?.model ?? null
    } catch (e) {
      return null
    }
  })

  const onModelChange = async (modelId: string) => {
    const m = (models() ?? []).find((x: any) => (x.id ?? x.modelID) === modelId)
    if (!m) return
    try {
      await props.ctx.client.session.switchModel({
        path: { id: props.session.id },
        body: { model: { providerID: m.providerID, id: m.id ?? m.modelID } },
      })
    } catch (e) {
      // ignore
    }
  }

  return (
    <div style={{ padding: "8px", display: "flex", "flex-direction": "column", gap: "8px" }}>
      <h3>{"CrewBee — agenti al lavoro"}</h3>

      <Show when={background().length === 0}>
        <p style={{ opacity: 0.6 }}>Nessun agente in background per questa sessione.</p>
      </Show>

      <For each={background()}>
        {(task: any) => (
          <div style={{ "padding-left": "8px", display: "flex", "flex-direction": "column", gap: "2px" }}>
            <strong>{task.type === "subagent" ? (task.agent ?? "subagent") : "shell"}</strong>
            <span style={{ "font-size": "12px", opacity: 0.7 }}>{task.label}</span>
          </div>
        )}
      </For>

      <hr style={{ opacity: 0.3 }} />

      <h4>{"Agenti CrewBee (" + (agents()?.length ?? 0) + ")"}</h4>
      <For each={agents() ?? []}>
        {(a: any) => (
          <div style={{ "padding-left": "8px", display: "flex", "flex-direction": "column", gap: "2px" }}>
            <strong>{a.id ?? a.name}</strong>
            <span style={{ "font-size": "12px", opacity: 0.7 }}>
              {"model: " + (a.model?.modelID ?? a.model?.id ?? a.model ?? "default")}
            </span>
          </div>
        )}
      </For>

      <hr style={{ opacity: 0.3 }} />

      <h4>{"Modello sessione corrente"}</h4>
      <select
        value={currentModel()?.id ?? currentModel()?.modelID ?? ""}
        onChange={(e) => onModelChange(e.currentTarget.value)}
        style={{ "font-size": "12px" }}
      >
        <For each={models() ?? []}>
          {(m: any) => (
            <option value={m.id ?? m.modelID}>
              {(m.providerID ?? "") + "/" + (m.id ?? m.modelID)}
            </option>
          )}
        </For>
      </select>

      <hr style={{ opacity: 0.3 }} />

      <h4>{"Sessioni aperte (" + (sessions()?.length ?? 0) + ")"}</h4>
      <For each={sessions() ?? []}>
        {(s: any) => (
          <div style={{ "padding-left": "8px", "font-size": "12px" }}>
            {"• " + (s.agent ?? "?") + " — " + (s.title ?? s.id)}
          </div>
        )}
      </For>

      <p style={{ "font-size": "11px", opacity: 0.5 }}>
        Il modello predefinito per agente si configura in crewbee.json (campo model) o opencode.json (agent.&lt;id&gt;.model).
      </p>
    </div>
  )
}