package xyz.spiceapp.mobile.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SpiceConnectRealtimeTest {
    @Test
    fun commandEventsWakePollingOnlyAfterACompleteSseRecord() {
        val parser = SpiceConnectRealtimeEventParser()

        assertNull(parser.consumeLine("event: command"))
        assertNull(parser.consumeLine("data: {}"))
        assertEquals(SpiceConnectRealtimeEvent.Command, parser.consumeLine(""))
    }

    @Test
    fun readyHeartbeatsAndUnknownEventsDoNotPretendToBeCommands() {
        val parser = SpiceConnectRealtimeEventParser()

        assertNull(parser.consumeLine(": keep-alive"))
        assertNull(parser.consumeLine(""))
        assertNull(parser.consumeLine("event: ready"))
        assertNull(parser.consumeLine("data: {}"))
        assertEquals(SpiceConnectRealtimeEvent.Ready, parser.consumeLine(""))
        assertNull(parser.consumeLine("event: something-else"))
        assertNull(parser.consumeLine(""))
    }

    @Test
    fun eventNameResetsBetweenRecords() {
        val parser = SpiceConnectRealtimeEventParser()

        assertNull(parser.consumeLine("event: command"))
        assertEquals(SpiceConnectRealtimeEvent.Command, parser.consumeLine(""))
        assertNull(parser.consumeLine(""))
    }

    @Test
    fun stateEventsRefreshControllersAfterACompleteSseRecord() {
        val parser = SpiceConnectRealtimeEventParser()

        assertNull(parser.consumeLine("event: state"))
        assertNull(parser.consumeLine("data: {}"))
        assertEquals(SpiceConnectRealtimeEvent.State, parser.consumeLine(""))
    }
}
