package xyz.spiceapp.mobile.data

internal enum class SpiceConnectRealtimeEvent {
    Ready,
    Command,
}

internal class SpiceConnectRealtimeEventParser {
    private var eventName = ""

    fun consumeLine(line: String): SpiceConnectRealtimeEvent? {
        if (line.isEmpty()) {
            val event = when (eventName) {
                "ready" -> SpiceConnectRealtimeEvent.Ready
                "command" -> SpiceConnectRealtimeEvent.Command
                else -> null
            }
            eventName = ""
            return event
        }
        if (line.startsWith("event:")) {
            eventName = line.substringAfter("event:").trim()
        }
        return null
    }
}
