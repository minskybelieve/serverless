'use strict';

const sinon = require('sinon');
const os = require('os');
const path = require('path');
const BbPromise = require('bluebird');
const expect = require('chai').expect;
const AwsDeploy = require('../index');
const Serverless = require('../../../../Serverless');

describe('uploadDeploymentPackage', () => {
  let serverless;
  let awsDeploy;

  beforeEach(() => {
    serverless = new Serverless();
    const options = {
      stage: 'dev',
      region: 'us-east-1',
    };
    awsDeploy = new AwsDeploy(serverless, options);
    awsDeploy.serverless.cli = new serverless.classes.CLI();
  });

  describe('#getServiceObjectsFromS3Bucket()', () => {
    it('should resolve if no service objects are found', () => {
      const serviceObjects = {
        Contents: [],
      };

      const listObjectsStub = sinon
        .stub(awsDeploy.sdk, 'request').returns(BbPromise.resolve(serviceObjects));

      return awsDeploy.getServiceObjectsFromS3Bucket().then(() => {
        expect(listObjectsStub.calledOnce).to.be.equal(true);
        expect(listObjectsStub.calledWith(awsDeploy.options.stage, awsDeploy.options.region));
        awsDeploy.sdk.request.restore();
      });
    });

    it('should return all to be removed service objects from the S3 bucket', () => {
      const serviceObjects = {
        Contents: [
          {
            Key: 'first-service',
          },
          {
            Key: 'second-service',
          },
        ],
      };

      const listObjectsStub = sinon
        .stub(awsDeploy.sdk, 'request').returns(BbPromise.resolve(serviceObjects));

      return awsDeploy.getServiceObjectsFromS3Bucket().then(() => {
        expect(listObjectsStub.calledOnce).to.be.equal(true);
        expect(listObjectsStub.calledWith(awsDeploy.options.stage, awsDeploy.options.region));
        awsDeploy.sdk.request.restore();
      });
    });
  });

  describe('#cleanupS3Bucket()', () => {
    let deleteObjectsStub;

    beforeEach(() => {
      deleteObjectsStub = sinon
        .stub(awsDeploy.sdk, 'request').returns(BbPromise.resolve());
    });

    it('should resolve if no service objects are found in the S3 bucket', () => awsDeploy
      .cleanupS3Bucket().then(() => {
        expect(deleteObjectsStub.calledOnce).to.be.equal(false);
        awsDeploy.sdk.request.restore();
      })
    );

    it('should remove all old service files from the S3 bucket if available', () => {
      const serviceObjects = [{ Key: 'first-service' }, { Key: 'second-service' }];

      return awsDeploy.cleanupS3Bucket(serviceObjects).then(() => {
        expect(deleteObjectsStub.calledOnce).to.be.equal(true);
        expect(deleteObjectsStub.calledWith(awsDeploy.options.stage, awsDeploy.options.region));
        awsDeploy.sdk.request.restore();
      });
    });
  });

  describe('#uploadZipFileToS3Bucket()', () => {
    it('should upload the zip file to the S3 bucket', () => {
      const tmpDirPath = path.join(os.tmpdir(), (new Date).getTime().toString());
      const artifactFilePath = path.join(tmpDirPath, 'artifact.zip');
      serverless.utils.writeFileSync(artifactFilePath, 'artifact.zip file content');

      awsDeploy.serverless.service.package.artifact = artifactFilePath;

      const putObjectStub = sinon
        .stub(awsDeploy.sdk, 'request').returns(BbPromise.resolve());

      return awsDeploy.uploadZipFileToS3Bucket().then(() => {
        expect(putObjectStub.calledOnce).to.be.equal(true);
        expect(putObjectStub.calledWith(awsDeploy.options.stage, awsDeploy.options.region));
        awsDeploy.sdk.request.restore();
      });
    });
  });
});