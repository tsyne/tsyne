#!/bin/bash
# Create iOS Xcode project with nodejs-mobile
# REQUIRES: macOS with Xcode and CocoaPods

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FORIOS_DIR="$(dirname "$SCRIPT_DIR")"
TSYNE_ROOT="$(dirname "$FORIOS_DIR")"
IOS_PROJECT="$FORIOS_DIR/ios-project"
BUNDLE_DIR="$FORIOS_DIR/bundle"

echo "=== Create iOS Project ==="

# Check we're on macOS
if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "Error: This script requires macOS with Xcode"
    exit 1
fi

# Check bundle exists
if [ ! -f "$BUNDLE_DIR/phonetop.bundle.js" ]; then
    echo "Error: Bundle not found. Run ./forios/scripts/bundle.sh first"
    exit 1
fi

# Check for CocoaPods
if ! command -v pod &> /dev/null; then
    echo "Installing CocoaPods..."
    sudo gem install cocoapods
fi

echo ""
echo "Creating iOS project structure..."
mkdir -p "$IOS_PROJECT/TsynePhone"
mkdir -p "$IOS_PROJECT/TsynePhone/nodejs-assets/nodejs-project"

# Copy bundle to nodejs-assets
echo "Copying bundle to iOS project..."
cp -r "$BUNDLE_DIR"/* "$IOS_PROJECT/TsynePhone/nodejs-assets/nodejs-project/"

# Create Podfile for nodejs-mobile
echo "Creating Podfile..."
cat > "$IOS_PROJECT/Podfile" << 'EOF'
platform :ios, '11.0'

target 'TsynePhone' do
  use_frameworks!

  # nodejs-mobile for running JavaScript
  pod 'NodeMobile', '~> 18.17.1'
end

post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '11.0'
    end
  end
end
EOF

# Create basic AppDelegate.swift
echo "Creating Swift app files..."
mkdir -p "$IOS_PROJECT/TsynePhone"

cat > "$IOS_PROJECT/TsynePhone/AppDelegate.swift" << 'EOF'
import UIKit
import NodeMobile

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        // Start Node.js
        startNodeJS()

        // Create window (Fyne will manage the actual UI)
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = UIViewController()
        window?.makeKeyAndVisible()

        return true
    }

    private func startNodeJS() {
        // Get path to nodejs-project within the app bundle
        guard let nodePath = Bundle.main.path(forResource: "nodejs-project/main", ofType: "js", inDirectory: "nodejs-assets") else {
            print("Error: Could not find Node.js entry point")
            return
        }

        // Start Node.js in a background thread
        DispatchQueue.global(qos: .userInitiated).async {
            let nodeDir = (nodePath as NSString).deletingLastPathComponent

            // Change to the node project directory
            FileManager.default.changeCurrentDirectoryPath(nodeDir)

            // Start Node.js with our main.js
            NodeMobile.startNodeProject("main.js")
        }
    }
}
EOF

# Create Info.plist
cat > "$IOS_PROJECT/TsynePhone/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>UILaunchStoryboardName</key>
    <string>LaunchScreen</string>
    <key>UIRequiredDeviceCapabilities</key>
    <array>
        <string>armv7</string>
    </array>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
    </array>
    <key>UISupportedInterfaceOrientations~ipad</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
</dict>
</plist>
EOF

# Create launch screen storyboard
cat > "$IOS_PROJECT/TsynePhone/LaunchScreen.storyboard" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="21701" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="01J-lp-oVM">
    <scenes>
        <scene sceneID="EHf-IW-A2E">
            <objects>
                <viewController id="01J-lp-oVM" sceneMemberID="viewController">
                    <view key="view" contentMode="scaleToFill" id="Ze5-6b-2t3">
                        <rect key="frame" x="0.0" y="0.0" width="393" height="852"/>
                        <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                        <subviews>
                            <label opaque="NO" userInteractionEnabled="NO" contentMode="left" horizontalHuggingPriority="251" verticalHuggingPriority="251" text="Tsyne Phone" textAlignment="center" lineBreakMode="tailTruncation" baselineAdjustment="alignBaselines" adjustsFontSizeToFit="NO" translatesAutoresizingMaskIntoConstraints="NO" id="label">
                                <rect key="frame" x="0.0" y="411" width="393" height="30"/>
                                <fontDescription key="fontDescription" type="system" pointSize="24"/>
                            </label>
                        </subviews>
                        <color key="backgroundColor" systemColor="systemBackgroundColor"/>
                        <constraints>
                            <constraint firstItem="label" firstAttribute="centerX" secondItem="Ze5-6b-2t3" secondAttribute="centerX" id="cx"/>
                            <constraint firstItem="label" firstAttribute="centerY" secondItem="Ze5-6b-2t3" secondAttribute="centerY" id="cy"/>
                        </constraints>
                    </view>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="iYj-Kq-Ea1" userLabel="First Responder" sceneMemberID="firstResponder"/>
            </objects>
        </scene>
    </scenes>
</document>
EOF

echo ""
echo "Installing CocoaPods dependencies..."
cd "$IOS_PROJECT"
pod install

echo ""
echo "=== iOS Project Created ==="
echo ""
echo "Project location: $IOS_PROJECT"
echo ""
echo "Next steps:"
echo "  1. Open $IOS_PROJECT/TsynePhone.xcworkspace in Xcode"
echo "  2. Configure signing (Team, Bundle ID)"
echo "  3. Connect iPhone and build/run"
echo ""
echo "NOTE: The Fyne bridge integration is TODO - currently this just runs Node.js"
echo "      Full integration requires linking tsyne-bridge.a and IPC setup"
