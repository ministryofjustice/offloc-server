const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const createAppInfo = require('../../server/services/app-info');

describe('app-info service', () => {
  let appInfo;

  context('with build-info.json', () => {
    let buildInfo;

    const projectRoot = path.resolve(__dirname, '../../');
    const buildInfoPath = path.resolve(projectRoot, 'build-info.json');

    before(done => exec(
      './bin/record-build-info',
      {
        cwd: projectRoot,
        env: {
          PATH: process.env.PATH,
          BUILD_NUMBER: '123',
          GIT_REF: 'deadbeeffaceddeaffadeddad',
          GIT_DATE: '2017-05-31T15:35:26+00:00',
        },
      },
      done,
    ));
    before(() => {
      buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf-8'));

      appInfo = createAppInfo(buildInfo);
    });

    it('provides all build info', () => {
      expect(appInfo.getBuildInfo()).to.eql(buildInfo);
    });
    it('provides gitRef from build info', () => {
      expect(appInfo.getGitRef()).to.eql('deadbeeffaceddeaffadeddad');
    });
    it('provides gitDate from build info', () => {
      expect(appInfo.getGitDate()).to.eql(new Date('2017-05-31T15:35:26Z'));
    });
  });

  context('without build-info.json', () => {
    before(() => {
      appInfo = createAppInfo();
    });
    it('provides all build info', () => {
      const info = appInfo.getBuildInfo();
      expect(info).to.have.keys('buildNumber', 'gitRef', 'gitDate');
    });
    it('provides gitRef from .git', () => {
      expect(appInfo.getGitRef()).to.match(/^[a-f\d]{40}$/);
    });
    it('provides gitDate from .git', () => {
      expect(appInfo.getGitDate()).to.be.a('date');
    });
  });
});
