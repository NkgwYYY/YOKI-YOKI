# Standalone UI tests for the installed Release app. No application source or
# device-family setting is changed by this diagnostic/test runner.
require 'xcodeproj'
require 'fileutils'
require 'json'

destination = File.expand_path(ARGV.fetch(0))
FileUtils.mkdir_p(destination)
project = Xcodeproj::Project.new(File.join(destination, 'YokiReview.xcodeproj'))
target = project.new_target(:ui_test_bundle, 'YokiReviewUITests', :ios, '15.1')
source = File.expand_path('CostumeReleaseJourney.swift', __dir__)
target.source_build_phase.add_file_reference(project.main_group.new_file(source))
target.resources_build_phase.add_file_reference(project.main_group.new_file(File.expand_path('Costumes44.storekit', __dir__)))
target.build_configurations.each do |configuration|
  configuration.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'dev.yokiyoki.review-uitests',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'SWIFT_VERSION' => '5.0',
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'CODE_SIGNING_ALLOWED' => 'NO',
  })
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.add_test_target(target)
scheme.test_action.build_configuration = 'Release'
# Activate the StoreKit configuration through the generated test plan as well
# as SKTestSession. Only this standalone test project is changed.
FileUtils.cp(File.expand_path('Costumes44.storekit', __dir__), File.join(destination, 'Costumes44.storekit'))
plan = {
  'configurations' => [{ 'id' => '1C41416D-C511-4BF5-8634-9EBC1D40E036', 'name' => 'Japan StoreKit', 'options' => {} }],
  'defaultOptions' => { 'storeKitConfiguration' => { 'identifier' => 'Costumes44.storekit' }, 'testLanguage' => 'ja', 'testRegion' => 'JP' },
  'testTargets' => [{ 'target' => { 'containerPath' => 'container:YokiReview.xcodeproj', 'identifier' => target.uuid, 'name' => target.name } }],
  'version' => 1,
}
File.write(File.join(destination, 'Costume44.xctestplan'), JSON.pretty_generate(plan))
scheme.test_action.xml_element.add_element('TestPlans').add_element('TestPlanReference', { 'reference' => 'container:Costume44.xctestplan', 'default' => 'YES' })
scheme.launch_action.xml_element.add_element('StoreKitConfigurationFileReference', { 'identifier' => File.join(destination, 'Costumes44.storekit') })
scheme.save_as(project.path, 'YokiReviewUITests', true)
