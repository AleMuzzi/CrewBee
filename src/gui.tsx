import { Plugin } from "@opencode/plugin/gui"
import { For, Show, createMemo, createResource } from "solid-js"
import { Command, Panel } from "@opencode/plugin/gui"
import { Schema } from "effect"
import { Ipc } from "@opencode/plugin/gui"

const CrewBeeConfig = Ipc.define({
  id: "crewbee",
  methods: {
    setAgentModel: {
      input: Schema.Struct({ agentId: Schema.String, providerID: Schema.String, modelID: Schema.String }),
      output: Schema.Struct({ ok: Schema.Boolean }),
    },
  },
})

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
  main(ctx) {
    ctx.provide(CrewBeeConfig, {
      setAgentModel: async (input) => {
        try {
          const fs = await import("node:fs")
          const path = await import("node:path")
          const os = await import("node:os")
          const configPath = path.join(os.homedir(), ".config", "opencode", "opencode.json")
          let config: any = {}
          if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, "utf8"))
          }
          if (!config.agent) config.agent = {}
          if (!config.agent[input.agentId]) config.agent[input.agentId] = {}
          config.agent[input.agentId].model = input.providerID + "/" + input.modelID
          fs.mkdirSync(path.dirname(configPath), { recursive: true })
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8")
          return { ok: true }
        } catch (e) {
          return { ok: false }
        }
      },
    })
  },
})

function extractAgentName(s: any): string {
  if (s.agent && s.agent !== "subagent" && s.agent !== "unknown") return s.agent
  const title = s.title ?? ""
  const idx = title.indexOf(": ")
  if (idx > 0) return title.slice(0, idx).trim()
  return s.agent ?? "?"
}

function Section(props: { title: string; children: any }) {
  const [open, setOpen] = createSignal(true)
  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "4px" }}>
      <div
        style={{ cursor: "pointer", "font-weight": "bold", display: "flex", "align-items": "center", gap: "4px", "user-select": "none" }}
        onClick={() => setOpen(!open())}
      >
        <span style={{ "font-size": "10px", width: "12px" }}>{open() ? "▼" : "▶"}</span>
        <span>{props.title}</span>
      </div>
      <Show when={open()}>
        <div style={{ "padding-left": "16px", display: "flex", "flex-direction": "column", gap: "4px" }}>
          {props.children}
        </div>
      </Show>
    </div>
  )
}

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

  const [defaultModel] = createResource(async () => {
    try {
      const res = await props.ctx.client.model.default()
      return res?.data ?? res ?? null
    } catch (e) {
      return null
    }
  })

  const crewbeeSessions = createMemo(() =>
    (sessions() ?? []).filter((s: any) => {
      const name = extractAgentName(s)
      return name.startsWith("coding-") || name.startsWith("crewbee")
    })
  )

  const onAgentModelChange = async (agentId: string, modelId: string) => {
    if (!modelId) return
    const m = (models() ?? []).find((x: any) => (x.id ?? x.modelID) === modelId)
    if (!m) return
    try {
      await props.ctx.main(CrewBeeConfig).setAgentModel({
        agentId,
        providerID: m.providerID,
        modelID: m.id ?? m.modelID,
      })
    } catch (e) {
      // ignore
    }
  }

  const agentModelLabel = (a: any) => {
    const m = a.model
    if (m && (m.id || m.modelID)) return (m.providerID ? m.providerID + "/" : "") + (m.id ?? m.modelID)
    const dm = defaultModel()
    if (dm) return "host default → " + (dm.id ?? dm.modelID ?? "?")
    return "host default"
  }

  const dmLabel = () => {
    const dm = defaultModel()
    return dm ? (dm.id ?? dm.modelID ?? "?") : "default"
  }

  const lastMessage = (s: any) => {
    // session list doesn't include messages; show title
    return s.title ?? s.id
  }

  return (
    <div style={{ padding: "8px", display: "flex", "flex-direction": "column", gap: "8px", "max-height": "100%", "overflow-y": "auto" }}>
      <h3>{"CrewBee — agenti al lavoro"}</h3>

      <Section title={"Task in background (" + background().length + ")"}>
        <Show when={background().length === 0}>
          <p style={{ opacity: 0.6, margin: 0 }}>Nessun agente in background per questa sessione.</p>
        </Show>
        <For each={background()}>
          {(task: any) => (
            <div style={{ display: "flex", "flex-direction": "column", gap: "2px" }}>
              <strong>{task.type === "subagent" ? (task.agent ?? "subagent") : "shell"}</strong>
              <span style={{ "font-size": "12px", opacity: 0.7 }}>{task.label}</span>
            </div>
          )}
        </For>
      </Section>

      <Section title={"Agenti CrewBee (" + (agents()?.length ?? 0) + ")"}>
        <p style={{ "font-size": "11px", opacity: 0.6, margin: 0 }}>
          {"Modello effettivo: host default (" + dmLabel() + ") se non configurato, altrimenti quello in crewbee.json"}
        </p>
        <For each={agents() ?? []}>
          {(a: any) => (
            <div style={{ display: "flex", "flex-direction": "column", gap: "4px", "margin-bottom": "8px" }}>
              <strong>{a.id ?? a.name}</strong>
              <span style={{ "font-size": "12px", opacity: 0.7 }}>
                {"model: " + agentModelLabel(a)}
              </span>
              <select
                style={{ "font-size": "11px", "max-width": "100%" }}
                onChange={(e) => onAgentModelChange(a.id ?? a.name, e.currentTarget.value)}
              >
                <option value="">{agentModelLabel(a) + " (attuale)"}</option>
                <For each={models() ?? []}>
                  {(m: any) => (
                    <option value={m.id ?? m.modelID}>
                      {(m.providerID ?? "") + "/" + (m.id ?? m.modelID)}
                    </option>
                  )}
                </For>
              </select>
            </div>
          )}
        </For>
      </Section>

      <Section title={"Sessioni CrewBee (" + crewbeeSessions().length + ")"}>
        <Show when={crewbeeSessions().length === 0}>
          <p style={{ opacity: 0.6, margin: 0, "font-size": "12px" }}>Nessuna sessione CrewBee attiva.</p>
        </Show>
        <For each={crewbeeSessions()}>
          {(s: any) => (
            <div style={{ "font-size": "12px", "margin-bottom": "4px" }}>
              {"• " + extractAgentName(s) + " — " + (s.title ?? s.id)}
            </div>
          )}
        </For>
      </Section>

      <Section title={"Tutte le sessioni (" + (sessions()?.length ?? 0) + ")"}>
        <For each={sessions() ?? []}>
          {(s: any) => (
            <div style={{ "font-size": "12px", "margin-bottom": "2px" }}>
              {"• " + extractAgentName(s) + " — " + (s.title ?? s.id)}
            </div>
          )}
        </For>
      </Section>

      <p style={{ "font-size": "11px", opacity: 0.5 }}>
        Cambiare il modello per agente aggiorna opencode.json (agent.&lt;id&gt;.model). Riavvia OpenCode per applicare.
      </p>
    </div>
  )
}