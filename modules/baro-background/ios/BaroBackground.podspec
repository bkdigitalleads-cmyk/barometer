Pod::Spec.new do |s|
  s.name           = 'BaroBackground'
  s.version        = '1.0.0'
  s.summary        = 'Background pressure readings for Barometer'
  s.description    = 'Takes one reading from the pressure sensor when iOS runs the app in the background, keeps it until the app opens, and checks the pressure change alert. No network.'
  s.author         = 'Brian Kershner'
  s.homepage       = 'https://bkdigitalleads-cmyk.github.io/barometer/'
  s.license        = { :type => 'Proprietary' }
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreMotion', 'BackgroundTasks', 'UserNotifications', 'UIKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
