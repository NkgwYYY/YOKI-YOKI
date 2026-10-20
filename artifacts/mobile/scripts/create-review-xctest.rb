# Standalone UI tests for the installed Release app. No application source or
# device-family setting is changed by this diagnostic/test runner.
require 'xcodeproj'
require 'fileutils'

destination = File.expand_path(ARGV.fetch(0))
FileUtils.mkdir_p(destination)
project = Xcodeproj::Project.new(File.join(destination, 'YokiReview.xcodeproj'))
target = project.new_target(:ui_test_bundle, 'YokiReviewUITests', :ios, '15.1')
source = File.expand_path('ReviewJourneys.swift', __dir__)
target.source_build_phase.add_file_reference(project.main_group.new_file(source))
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
scheme.save_as(project.path, 'YokiReviewUITests', true)
