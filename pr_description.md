🎯 **What:** Removed hardcoded fallback string for `JWT_SECRET` and `PROFILE_CONNECTION_SECRET`.
⚠️ **Risk:** The previous code would silently fallback to a known string if the required `JWT_SECRET` environment variable was unset, rendering all signed JWTs trivially forgeable by anyone with access to the source code.
🛡️ **Solution:** The application now explicitly throws a startup error if the required `JWT_SECRET` environment variable is absent.
