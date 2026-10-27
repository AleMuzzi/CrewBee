import { Plugin } from "@opencode/plugin/tui"
import { For, Show, createMemo } from "solid-js"
import { TextAttributes } from "@opentui/core"

export default Plugin.define({
  id: "crewbee-activity",
  async setup(context) {
    context.keymap.layer(() => ({
      commands: [
        {
          id: "crewbee.activity",
          title: "CrewBee: agent activity",
          palette: true,
          slash: { name: "crewbee-activity" },
          run: () => {
            context.ui.panel.open("crewbee-activity")
          },
        },
      ],
    }))

    context.ui.slot({
      replace: "session.panel",
      render: (input) => (
        <Show when={input.name === "crewbee-activity"}>
          <CrewBeeActivityPanel context={context} />
        </Show>
      ),
    })
  },
})

function CrewBeeActivityPanel(props: { context: Plugin.Context }) {
  const running = createMemo(() =>
    props.context.data
      .session.list()
      .filter((session) => props.context.data.session.status(session.id) === "running")
      .sort((a, b) => (a.title ?? a.id).localeCompare(b.title ?? b.id)),
  )

  const lastText = (sessionID: string) => {
    const msgs = props.context.data.session.message.list(sessionID)
    const last = [...msgs].reverse().find((m) => m.type === "assistant")
    if (!last || last.type !== "assistant") return ""
    return last.content
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join(" ")
      .slice(0, 140)
  }

  return (
    <box flexDirection="column" gap={1} padding={1}>
      <text attributes={TextAttributes.BOLD}>
        {"CrewBee — agenti al lavoro (" + running().length + ")"}
      </text>
      <Show when={running().length === 0}>
        <text>Nessun agente in esecuzione.</text>
      </Show>
      <For each={running()}>
        {(session) => (
          <box flexDirection="column" paddingLeft={1}>
            <text>{"• " + (session.agent ?? "unknown") + " — " + (session.title ?? session.id)}</text>
            <text attributes={TextAttributes.DIM}>{lastText(session.id)}</text>
          </box>
        )}
      </For>
      <text attributes={TextAttributes.DIM}>Esc per chiudere il pannello.</text>
    </box>
  )
}