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

function CrewBeeActivityPanel(props: { ctx: any; session: any }) {
  const background = () => props.session.background ?? []

  const [agents, { refetch: refetchAgents }] = createResource(async () => {
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

  const [sessionInfo, setSessionInfo] = createResource(async () => {
    try {
      const res = await props.ctx.client.session.get({ path: { id: props.session.id } })
      return res?.data ?? res ?? null
    } catch (e) {
      return null
    }
  })

  const currentModelId = () => {
    const m = sessionInfo()?.model
    return m?.id ?? ""
  }

  const onSessionModelChange = async (modelId: string) => {
    const m = (models() ?? []).find((x: any) => (x.id ?? x.modelID) === modelId)
    if (!m) return
    try {
      await props.ctx.client.session.switchModel({
        path: { id: props.session.id },
        body: { model: { providerID: m.providerID, id: m.id ?? m.modelID } },
      })
      const res = await props.ctx.client.session.get({ path: { id: props.session.id } })
      setSessionInfo(res?.data ?? res ?? null)
    } catch (e) {
      // ignore
    }
  }

  const onAgentModelChange = async (agentId: string, modelId: string) => {
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
    if (dm) return "host default (" + (dm.id ?? dm.modelID ?? "?") + ")"
    return "host default"
  }

  return (
    <div style={{ padding: "8px", display: "flex", "flex-direction": "column", gap: "8px", "max-height": "100%", "overflow-y": "auto" }}>
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
          <div style={{ "padding-left": "8px", display: "flex", "flex-direction": "column", gap: "4px", "margin-bottom": "8px" }}>
            <strong>{a.id ?? a.name}</strong>
            <span style={{ "font-size": "12px", opacity: 0.7 }}>
              {"model: " + agentModelLabel(a)}
            </span>
            <select
              style={{ "font-size": "11px", "max-width": "100%" }}
              onChange={(e) => onAgentModelChange(a.id ?? a.name, e.currentTarget.value)}
            >
              <option value="">{agentModelLabel(a)}</option>
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

      <hr style={{ opacity: 0.3 }} />

      <h4>{"Modello sessione corrente"}</h4>
      <div style={{ "font-size": "12px", opacity: 0.7, "margin-bottom": "4px" }}>
        {"In uso: " + (currentModelId() || "default")}
      </div>
      <select
        value={currentModelId()}
        onChange={(e) => onSessionModelChange(e.currentTarget.value)}
        style={{ "font-size": "12px" }}
      >
        <Show when={currentModelId() && !(models() ?? []).some((m: any) => (m.id ?? m.modelID) === currentModelId())}>
          <option value={currentModelId()}>{currentModelId()}</option>
        </Show>
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
        Cambiare il modello per agente aggiorna opencode.json (agent.&lt;id&gt;.model). Riavvia OpenCode per applicare.
      </p>
    </div>
  )
}