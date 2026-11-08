# Add UI tests to the disposable simulator project's real application target.
# The separately generated distribution project never runs this script.
require 'xcodeproj'

project = Xcodeproj::Project.open(File.expand_path('../ios/YOKIYOKI.xcodeproj', __dir__))
app = project.targets.find { |target| target.name == 'YOKIYOKI' }
raise 'Application target missing' unless app
raise 'UI test target already installed' if project.targets.any? { |t| t.name == 'YokiReleaseUITests' }
target = project.new_target(:ui_test_bundle, 'YokiReleaseUITests', :ios, '15.1')
target.add_dependency(app)
%w[RoomReleaseJourney55.swift RecordReleaseJourney54.swift].each do |name|
  target.source_build_phase.add_file_reference(project.main_group.new_file(File.expand_path(name, __dir__)))
end
fixture = File.expand_path('VisualProducts55.storekit', __dir__)
target.resources_build_phase.add_file_reference(project.main_group.new_file(fixture))
target.build_configurations.each do |configuration|
  configuration.build_settings.merge!({
    'PRODUCT_NAME' => target.name,
    'PRODUCT_MODULE_NAME' => target.name,
    'PRODUCT_BUNDLE_IDENTIFIER' => 'dev.yokiyoki.release-uitests',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'SWIFT_VERSION' => '5.0',
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'TEST_TARGET_NAME' => app.name,
    'CODE_SIGNING_ALLOWED' => 'YES',
    'CODE_SIGN_IDENTITY' => '-',
  })
end
project.root_object.attributes['TargetAttributes'] ||= {}
project.root_object.attributes['TargetAttributes'][target.uuid] = {'TestTargetID' => app.uuid}
project.save
scheme = Xcodeproj::XCScheme.new
scheme.configure_with_targets(app, target, launch_target: true)
scheme.test_action.build_configuration = 'Release'
scheme.launch_action.build_configuration = 'Release'
scheme.launch_action.xml_element.add_element('StoreKitConfigurationFileReference', {'identifier' => fixture})
scheme.save_as(project.path, 'YokiReleaseUITests', true)
puts 'Linked UI tests and StoreKit configuration to the simulator application target.'
