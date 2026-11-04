Pod::Spec.new do |s|
  s.name = 'YokiStones'
  s.version = '1.0.0'
  s.summary = 'Private StoreKit consumable delivery for YOKI YOKI'
  s.description = s.summary
  s.license = { :type => 'Proprietary' }
  s.author = 'YOKI YOKI'
  s.homepage = 'https://yoki-yoki.replit.app'
  s.source = { :git => '' }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
