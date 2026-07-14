# SPICE Local Runtime Third-Party Notices

The SPICE local runtime includes `ffmpeg-static` and a platform-specific FFmpeg binary so user-requested audio downloads can be converted to MP3 on the user's own machine.

| Component | Version | License | Source |
| --- | --- | --- | --- |
| ffmpeg-static | 5.3.0 | GPL-3.0-or-later | https://github.com/eugeneware/ffmpeg-static |
| FFmpeg | Platform build selected by ffmpeg-static | GPL-3.0 for the bundled builds | https://ffmpeg.org/download.html#get-sources |
| LAME MP3 encoder | Included in the FFmpeg build | LGPL-2.0 | https://lame.sourceforge.io/ |

The runtime package keeps the binary's accompanying `ffmpeg.LICENSE` / `ffmpeg.exe.LICENSE` and `ffmpeg.README` / `ffmpeg.exe.README` files. Those files identify the exact build, license, configuration, and corresponding FFmpeg source revision distributed with that runtime.

SPICE is not affiliated with or endorsed by FFmpeg, LAME, or ffmpeg-static.
