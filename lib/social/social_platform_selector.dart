import 'social_platform.dart';

// Conditional import to resolve correct platform implementation at compile time
import 'social_stub.dart'
    if (dart.library.js_util) 'facebook_social.dart'
    if (dart.library.io) 'firebase_social.dart';

/// Factory method returning the appropriate SocialPlatform implementation.
SocialPlatform getSocialPlatform() => createPlatform();
